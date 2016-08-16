'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import MoieClient from './moie-client'
import * as util from './util'
import * as autocompleteProviderObj from './suggestion-provider'
import * as hyperclickProviderObj from './hyperclick-provider'
//import * as config from './config.js'
import { CompositeDisposable, BufferedProcess, File } from 'atom'

export default {

  config: require('./config.js'),

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,
  projectJson: "moie-project.json",
  triedAsSubprocess: false,

  autocompleteProvider() {
    return autocompleteProviderObj;
  },

  hyperclickProvider() {
    return hyperclickProviderObj;
  },

  consumeStatusBar(statusBar) {
    //called from 'status-bar' package (https://github.com/atom/status-bar)
    this.statusView = new StatusView()
    this.statusTile = statusBar.addLeftTile({'item': this.statusView.getRoot(), 'priority': 1})
  },

  activate(state) {
     //install package dependencies if not installed
     require('atom-package-deps').install('Moie').
	  then(() => console.log("dependencies installed"))

    this.infoView = new InfoView(state.infoViewState)
    this.infoPanel = atom.workspace.addBottomPanel({
      item: this.infoView.getRoot(),
      visible: false
    })

    this.validateConfigs(atom.config)

    this.client = new MoieClient(
        atom.config.get('Moie.interface'),
        atom.config.get('Moie.port'))
    this.markers = []

    autocompleteProviderObj.setClient(this.client)
    hyperclickProviderObj.setClient(this.client)

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'moie:connect': () => this.connect(),
      'moie:disconnect': () => this.disconnect(),
      'moie:compile-Project': () => {
        util.saveAllFiles()
        this.compileProject()
      },
      'moie:compile-with-Script': () => this.compileScript(),
      'moie:stop-Server': () => this.stopServer(),
      'moie:check-model': () => this.checkModel(),
      'moie:open-documentation': () => this.openDoc(),
      'moie:generate-project.json': () => this.generateProjectConfig()
    }))

    //before closing the window; send a disconnect
    window.onbeforeunload = (e) => {
      this.disconnect()
    }

    atom.workspace.observeTextEditors(editor => {
      const self = this
      editor.onDidSave( (ev) => {
        if(atom.config.get('Moie.compileMode') == 'while typing')
          self.userSavedFile(ev)
      })
    })
  },

  deactivate() {
    this.modalPanel.destroy()
    this.subscriptions.dispose()
    this.moieView.destroy()
  },

  serialize() {
    return {
      infoViewState: this.infoView.serialize(),
      statusViewState: this.statusView.serialize(),
    }
  },

  connect() {
    const self = this
    const projects = atom.project.getDirectories()
    if(projects.length == 1) {
      const projectPath = projects[0]
      this.readProjectFileContent(projectPath, json => {
        this.client.connect(json, () => {
          atom.notifications.addSuccess("Mo|E connected")
          this.statusView.success("connected")
        }, (status,msg) => {
          if(atom.config.get('Moie.startServer') && !this.triedAsSubprocess) {
            util.startMoieServer(() => this.connect())
            this.triedAsSubprocess = true
          } else {
            const interface = atom.config.get('Moie.interface')
            const port = atom.config.get('Moie.port')
            atom.notifications.addError(
              `Couldn't connect Mo|E to ${interface}:${port}!`,
              {dismissable: false, detail: msg}
            )
            this.statusView.error("disconnected")
          }
        })
      })
    } else {
      atom.notifications.addError("Can't handle multiple project-roots.\nUse 1 project")
      this.statusView.error("error")
    }
  },

  readProjectFileContent(rootDir, onSuccess) {
    const file = rootDir.getFile(this.projectJson)
    if(file.existsSync() && file.isFile()) {
      file.read(true).then(onSuccess)
    } else {
      atom.notifications.addError(`Please generate a ${this.projectJson} in\n${rootDir.path}`)
    }
  },

  disconnect() {
    console.log("disconnect pressed")
    this.client.disconnect(() => {
      atom.notifications.addSuccess("Mo|E disconnected!")
      this.statusView.success("disconnected")
      this.infoPanel.hide()
    })
    this.clearErrors()
    this.triedAsSubprocess = false
  },

  stopServer() {
    this.client.stopServer(() => {
      this.statusView.success("disconnected")
      atom.notifications.addSuccess("Server stopped")
    })
    this.clearErrors()
  },

  compileProject() {
    this.clearErrors()
    util.withCurrentFile("Can't compile an unknown file", filepath => {
      if(util.isModelicaScript(filepath)) {
        this.client.compileScript(
          filepath,
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      } else {
        this.client.compile(
          filepath,
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      }
    })
  },

  compileScript() {
    this.clearErrors()
    util.withCurrentFile("Can't compile an unknown script", filepath => {
      if(util.isModelicaScript(filepath)) {
        this.client.compileScript(
          filepath,
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this)
        )
      } else {
        this.client.compileScript(
          undefined,
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      }
    })
  },

  checkModel() {
    this.clearErrors()
    util.withCurrentFile("Can't check an unknown model", filepath => {
      if(util.isModelicaFile(filepath)) {
        this.client.checkModel(filepath, (data) => {
          console.log(data)
          console.log("success")
          const options = {
            detail: data,
            dismissable: true,
            icon: 'check'
          }
          atom.notifications.addInfo("Checking your model", options)
        }, (xhr, status, error) => {
          console.log(xhr, status, error)
          atom.notifications.addError(xhr.responseText)
          this.statusView.error("server-error")
        })
      } else {
        atom.notifications.addError("Can't check a non-modelica file!")
      }
    })
  },

  openDoc() {
    const editor = atom.workspace.getActiveTextEditor()
    const buffer = editor.getBuffer()
    const cursorPos = editor.getCursorBufferPosition()
    const word = util.wordBelowPosition(cursorPos, buffer)
    console.log("found word", word)
    this.client.goToDoc(word)
  },

  onCompileSuccess(data) {
    const lines = data.map(util.createErrorLine)
    this.infoView.addLines(lines)
    if(lines.length != 0) {
      data.
        filter(x => x.file !== "").
        forEach(errorObj => {
        const errorRange = [[errorObj.start.line-1,errorObj.start.column],
        [errorObj.end.line-1,errorObj.end.column]]
        const promise = atom.workspace.open(errorObj.file, {activatePane:false})
        promise.then(this.highlightErrors(errorRange).bind(this))
      })
      this.infoPanel.show()
    }
    else
      this.statusView.success("compiled")
  },

  highlightErrors(range) {
    return (editor) => {
      const rangeMarker = editor.markBufferRange(range, {invalidate:'never'})
      this.markers.push(rangeMarker)
      editor.decorateMarker(rangeMarker, {type: 'line-number', class: 'line-number-error'})
      this.statusView.error("compile errors")
    }
  },

  onCompileError(xhr, status,error) {
    if(xhr.status == 500) {
      atom.notifications.addError("InternalServerError.. Restart server and try agin.")
      this.statusView.error("server-error")
    } else if(xhr.status == 404) {
      atom.notifications.addError(xhr.responseText)
      this.statusView.error("server-error")
    }
    else {
      atom.notifications.addError("Can't contact server.. Restart server and try agin.")
      this.statusView.error("disconnected")
    }
  },

  clearErrors() {
    this.markers.forEach(marker => marker.destroy())
    this.infoPanel.hide()
  },

  userSavedFile(ev) {
    const path = ev.path
    if(util.isModelicaFile(path)) {
      this.compileProject()
    }
  },

  generateProjectConfig() {
    const projects = atom.project.getDirectories()
    if(projects.length == 1) {
      const projectDir = projects[0]
      const file = projectDir.getFile(this.projectJson)
      if(!file.existsSync()) {
        console.log("generating")
        //file.create()
        const projectPath = projectDir.getPath()
        const content =
          "{\n" +
            `\t"path": "${projectPath}",\n` +
            `\t"outputDirectory": "target"`+
          "\n}"
        file.write(content)
        console.log("written", content)
      } else console.log("already there")
    } else {
      atom.notifications.addError("Can't handle multiple project-roots.\nUse 1 project")
    }
  },

  validateConfigs(conf) {
      //don't check if subprocess shouldn't get created
    if(!conf.get('Moie.startServer'))
      return true

    const errors = []
    const javaExecFile = new File(conf.get('Moie.javaExec'))
    if(!javaExecFile.existsSync())
      errors.push("- Java Executable doesn't exist")

    const jarFile = new File(conf.get('Moie.moieExec'))
    if(!jarFile.existsSync())
      errors.push("- Moie Executable doesn't exist")
    if(!jarFile.getPath().endsWith(".jar"))
      errors.push("- Moie Executable must be a jar file")

    if(errors.length == 0)
      return true
    else {
      const detail = "Your configuration for Mo|E contains the following errors:\n"+
                    errors.join("\n") +
                    "\nFix this issues and restart Mo|E before continuing"
      atom.notifications.addError("Mo|e Configuration contains errors",
                                  {detail: detail})
      return false
    }
  }
}

'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import SelectProjectView from './select-project-view.js'
import MoieClient from './moie-client'
import * as util from './util'
import * as autocompleteProviderObj from './suggestion-provider'
import * as hyperclickProviderObj from './hyperclick-provider'
import { CompositeDisposable, BufferedProcess, File } from 'atom'

export default {

  config: require('./config.js'),

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,
  projectJson: "mope-project.json",
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
     require('atom-package-deps').install('MoPE').
	  then(() => console.log("dependencies installed"))

    this.infoView = new InfoView(state.infoViewState, atom.config.get('MoPE.statusViewFontSize'))
    this.infoPanel = atom.workspace.addBottomPanel({
      item: this.infoView.getRoot(),
      visible: false
    })

    this.validateConfigs(atom.config)

    this.client = new MoieClient(
        atom.config.get('MoPE.interface'),
        atom.config.get('MoPE.port'))
    this.markers = []

    autocompleteProviderObj.setClient(this.client)
    hyperclickProviderObj.setClient(this.client)

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'mope:connect': () => this.connect(),
      'mope:disconnect': () => this.disconnect(),
      'mope:compile-Project': () => {
        util.saveAllFiles()
        this.compileProject()
      },
      'mope:run-Script': () => this.compileScript(),
      'mope:stop-Server': () => this.stopServer(),
      'mope:check-model': () => this.checkModel(),
      'mope:open-documentation': () => this.openDoc(),
      'mope:show-type': () => this.displayType(),
      'mope:generate-project.json': () => this.generateProjectConfig(),
      'mope:open-server-config': () => this.openServerConfig(),
      'mope:open-server-log': () => this.openServerLog(),
      'mope:open-in-Move': () => this.openInMove()
    }))

    //before closing the window; send a disconnect
    window.onbeforeunload = (e) => {
      this.disconnect()
    }

    atom.workspace.observeTextEditors(editor => {
      const self = this
      editor.onDidSave( (ev) => {
        if(atom.config.get('MoPE.compileMode') === 'while typing')
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
    
    this.selectProject(atom.project.getDirectories()).
      then((projectPath) => {
        //TODO chain the calls using Promise.then instead of nested callback hell ;-)
        this.readProjectFileContent(projectPath, json => {
          this.client.connect(json).
            then(() => {
              atom.notifications.addSuccess("Mo|E connected")
              this.statusView.success("connected")
            }, (xhr, status,error) => {
              if(atom.config.get('MoPE.startServer') && !this.triedAsSubprocess) {
                util.startMoieServer(() => this.connect())
                this.triedAsSubprocess = true
              } else {
                const interface = atom.config.get('MoPE.interface')
                const port = atom.config.get('MoPE.port')
                atom.notifications.addError(
                  `Couldn't connect Mo|E to ${interface}:${port}!`,
                  {dismissable: false, detail: xhr.responseText}
                )
                this.statusView.error("disconnected")
              }
            })
        })
      }).catch( (error) => atom.notifications.addError(error.message) )
  },

  readProjectFileContent(rootDir, onSuccess) {
    const file = rootDir.getFile(this.projectJson)
    if(file.existsSync() && file.isFile()) {
      file.read(true).then(onSuccess)
    } else {
      this.generateProjectConfig().
        then(content => {
          atom.notifications.addWarning(`Using default ${this.projectJson}`,
            {detail: `Default ${this.projectJson}-file generated!\nMaybe you need to adjust it!`})
          return content
        }).
        then(onSuccess)
    }
  },

  selectProject(projects) {
    return new Promise((resolve, reject) => {
      if(projects.length == 1) resolve(projects[0])
      else {
        atom.notifications.addInfo("Select a project first.")
        const view = new SelectProjectView(projects, resolve, reject)
        view.show()
      }
    })
  },

  disconnect() {
    console.log("disconnect pressed")
    const handler = () => {
      atom.notifications.addSuccess("Mo|E disconnected!")
      this.statusView.success("disconnected")
      this.infoPanel.hide()
    }
    this.client.disconnect().then(handler, handler)
    this.clearErrors()
    this.triedAsSubprocess = false
  },

  stopServer() {
    this.client.stopServer().then(() => {
      this.statusView.success("disconnected")
      atom.notifications.addSuccess("Server stopped")
    })
    this.clearErrors()
  },

  compileProject() {
    this.clearErrors()
    util.withCurrentFile("Can't compile an unknown file", filepath => {
      if(util.isModelicaScript(filepath)) {
        this.client.compileScript(filepath).then(
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      } else {
        this.client.compile(filepath).then(
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      }
    })
  },

  compileScript() {
    this.clearErrors()
    util.withCurrentFile("Can't compile an unknown script", filepath => {
      if(util.isModelicaScript(filepath)) {
        this.client.compileScript(filepath).then(
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this)
        )
      } else {
        this.client.compileScript(undefined).then(
          this.onCompileSuccess.bind(this),
          this.onCompileError.bind(this))
      }
    })
  },

  checkModel() {
    this.clearErrors()
    util.withCurrentFile("Can't check an unknown model", filepath => {
      if(util.isModelicaFile(filepath)) {
        this.client.checkModel(filepath).
          then((data) => {
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
    const word = util.wordBelowCursor()
    console.log("found word", word)
    if(word !== undefined)
      this.client.goToDoc(word)
  },

  displayType() {
    const curFile = util.currentFile()
    const word = util.wordBelowCursor()
    if(curFile !== undefined && word !== undefined) {
      const cursorPos = util.cursorPosition()
      console.log("word", word, "position", cursorPos)
      this.client.getType(
        curFile,
        new util.FilePosition(cursorPos.row+1, cursorPos.column+1),
        word).then((data) => {
          const commentString = (data.comment !== undefined) ? " - "+data.comment : ""
          const typeLine = `<span class="error-line icon icon-info">
            <span class="info-badge">Type</span>
            <span class="bold">${data.type}</span> ${data.name} <span class="italic">${commentString}</span>
            </span>`
          this.infoView.addLines([typeLine])
          this.infoPanel.show()
        },
        (xhr) => {
          atom.notifications.addWarning("Coudldn't retrieve type", {detail: xhr.responseText})
        })
    }
  },

  onCompileSuccess(data) {
    const lines = data.map(util.createErrorLine)
    this.infoView.addLines(lines)
    if(lines.length !== 0) {
      data.
        filter(x => {
          //only open & mark opened files
          return x.file !== "" &&
            atom.workspace.getTextEditors().find(editor => editor.getPath() === x.file)
        }).
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

  onCompileError(xhr,status,error) {
    util.displayError(xhr, status)
    this.statusView.error("server-error")
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
    if(projects.length === 1) {
      const projectDir = projects[0]
      const file = projectDir.getFile(this.projectJson)
      if(!file.existsSync()) {
        //file.create()
        const projectPath = projectDir.getPath().replace(/\\/g, "\\\\")
        const content =
          "{\n" +
            `\t"path": "${projectPath}",\n` +
            `\t"outputDirectory": "target"`+
          "\n}"
        return file.write(content).then(() => content)
      }
    } else {
      atom.notifications.addError("Can't handle multiple project-roots.\nUse 1 project")
    }
  },

  openServerConfig() {
    atom.workspace.open(util.getConfigPath())
  },

  openServerLog() {
    atom.workspace.open(util.getLogPath())
  },

  openInMove() {
    const filepath = util.currentFile()
    this.client.openMove(filepath,
      () => { atom.notifications.addInfo("MoVE opened", {detail: `Open ${filepath} in MoVE.`}) },
      (xhr) => { atom.notifications.addError("Couldn't open MoVE.", {detail: xhr.responseText}) })
  },

  validateConfigs(conf) {
      //don't check if subprocess shouldn't get created
    if(!conf.get('MoPE.startServer'))
      return true

    const errors = []
    const javaExecFile = new File(conf.get('MoPE.javaExec'))
    if(!javaExecFile.existsSync())
      errors.push("- Java Executable doesn't exist")

    const jarFile = new File(conf.get('MoPE.mopeExec'))
    if(!jarFile.existsSync())
      errors.push("- MoPE Executable doesn't exist")
    if(!jarFile.getPath().endsWith(".jar"))
      errors.push("- MoPE Executable must be a jar file")

    if(errors.length === 0)
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

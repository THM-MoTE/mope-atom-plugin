'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import SelectProjectView from './select-project-view.js'
import MoieClient from './moie-client'
import DownloadManager from './downloads.js'
import DeclarationProvider from './declaration-provider.js'
import * as util from './util'
import * as autocompleteProviderObj from './suggestion-provider'
import { CompositeDisposable, BufferedProcess, File, Directory } from 'atom'

export default {

  config: require('./config.js'),

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,
  projectJson: "mope-project.json",
  triedAsSubprocess: false,
  declarationProvider: undefined,

  autocompleteProvider() {
    return autocompleteProviderObj;
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

    this.client = new MoieClient(
        atom.config.get('MoPE.interface'),
        atom.config.get('MoPE.port'))
    this.markers = []

    this.declarationProvider = new DeclarationProvider(this.client)
    autocompleteProviderObj.setClient(this.client)

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
      'mope:open-in-Move': () => this.openInMove(),
      'mope:recent-Projects': () => this.listRecentProjects(),
      'mope:goto-declaration': () => this.declarationProvider.goToDeclaration(),
      'mope:download-server-jar': () => this.downloadServer()
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
    if(!this.validateConfigs(atom.config))
      return

    const self = this
    this.selectProject(atom.project.getDirectories())
      .then(this.readProjectFileContent.bind(this))
      .then(x => this.client.connect(x))
      .then(() => {
        atom.notifications.addSuccess("Mo|E connected")
        this.statusView.success("connected")
      }, (xhr, status,error) => {
        if(atom.config.get('MoPE.startServer') && !this.triedAsSubprocess) {
          util.startMoieServer(() => this.connect())
          this.triedAsSubprocess = true
        } else {
          const mopeInterface = atom.config.get('MoPE.interface')
          const port = atom.config.get('MoPE.port')
          atom.notifications.addError(
            `Couldn't connect Mo|E to ${mopeInterface}:${port}!`,
            {dismissable: false, detail: xhr.responseText}
          )
          this.statusView.error("disconnected")
        }
      })
      .catch( (error) => atom.notifications.addError(error.message) )
  },

  readProjectFileContent(rootDir) {
    const file = rootDir.getFile(this.projectJson)
    if(file.existsSync() && file.isFile()) {
      return file.read(true)
    } else {
      return this.generateProjectConfig(rootDir).
        then(content => {
          atom.notifications.addWarning(`Using default ${this.projectJson}`,
            {detail: `Default ${this.projectJson}-file generated!\nMaybe you need to adjust it!`})
          return content
        })
    }
  },

  selectProject(projects) {
    return new Promise((resolve, reject) => {
      if(projects.length === 1) resolve(projects[0])
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

  generateProjectConfig(projectDir) {
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

  listRecentProjects() {
    this.client.recentProjects()
      .then( projectPaths => projectPaths.map(x => new Directory(x)) )
      .then( directories => new Promise((resolve, reject) => {
        atom.notifications.addInfo("Select a project first.")
        const view = new SelectProjectView(directories, resolve, reject)
        view.show()
      }))
      .then(projectPath => {
        //open selected project in new window
        console.log("selected ", projectPath)
        atom.open({pathsToOpen:[projectPath.getPath()]})
      }).catch( (error) => atom.notifications.addWarning("Didn't open project") )
  },

  downloadServer() {
    const self = this
    const homeDir = require('os').homedir()
    const uri = "https://github.com/THM-MoTE/mope-server/releases/download/v0.6.2/mope-server-0.6.2.jar"
    const targetFile = `${homeDir}/.mope/mope.jar`
    const megabyte = 1000000

    const progressHandler = percent => {
      self.statusView.updateText(`${(percent*100).toFixed(2)}%`)
    }

    const downloadManager = new DownloadManager(23.4*megabyte, progressHandler)
    downloadManager.downloadFile(uri, targetFile)
  },

  validateConfigs(conf) {
      //don't check if subprocess shouldn't get created
    if(!conf.get('MoPE.startServer'))
      return true

    const errors = []
    const javaExecFile = new File(conf.get('MoPE.javaExec').trim())
    if(!javaExecFile.existsSync())
      errors.push("- Java Executable doesn't exist")

    const jarFile = new File(conf.get('MoPE.mopeExec').trim())
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

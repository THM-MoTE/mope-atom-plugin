'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import MoieClient from './moie-client'
import { CompositeDisposable } from 'atom'

export default {

  config: {
    interface: {
      type: "string",
      default: "localhost"
    },
    port: {
      type: "integer",
      default: 9001
    },
    compileMode: {
      type: 'string',
      default: 'on demand',
      enum: [
        'on demand',
        'while typing'
      ]
    }
  },

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,
  projectJson: "moie-project.json",

  consumeStatusBar(statusBar) {
    this.statusView = new StatusView()
    atom.workspace.stta
    this.statusTile = statusBar.addLeftTile({'item': this.statusView.getRoot(), 'priority': 1})
  },

  activate(state) {
    this.infoView = new InfoView(state.infoViewState)
    this.infoPanel = atom.workspace.addBottomPanel({
      item: this.infoView.getRoot(),
      visible: false
    })

    this.client = new MoieClient(
        atom.config.get('Moie.interface'),
        atom.config.get('Moie.port'))
    this.markers = []

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'moie:connect': () => this.connect(),
      'moie:disconnect': () => this.disconnect(),
      'moie:compileProject': () => {
        this.saveAllFiles()
        this.compileProject()
      },
      'moie:stopServer': () => this.stopServer()
    }))

    atom.workspace.observeTextEditors(editor => {
      if(atom.config.get('Moie.compileMode') == 'while typing')
        editor.onDidSave(this.userSavedFile.bind(this))
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
    console.log("connect pressed")
    const projects = atom.project.getDirectories()
    if(projects.length == 1) {
      const projectPath = projects[0]
      this.readProjectFileContent(projectPath, json => {
        this.client.connect(json, () => {
          atom.notifications.addSuccess("Mo|E connected")
          this.statusView.success("connected")
        }, (status,error) => {
          atom.notifications.addError(`Couldn't connect Mo|E to the server!`)
          this.statusView.error("disconnected")
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
      const file = rootDir.getFile(this.projectJson)
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
  },

  stopServer() {
    console.log('stop server')
    this.client.stopServer(() => {
      this.statusView.success("disconnected")
      atom.notifications.addSuccess("Server stopped")
    })
    this.clearErrors()
  },

  compileProject() {
    console.log("compileProject pressed")
    this.clearErrors()
    const filepath = atom.workspace.getActiveTextEditor().getPath()
    console.log("open file", filepath)
    if(this.isModelicaScript(filepath)) {
      this.client.compileScript(
        filepath,
        this.onCompileSuccess.bind(this),
        this.onCompileError.bind(this))
    } else {
      this.client.compile(
        this.onCompileSuccess.bind(this),
        this.onCompileError.bind(this)
      )
    }
  },

  onCompileSuccess(data) {
    const lines = data.map(this.createErrorLine)
    this.infoView.addLines(lines)
    if(lines.length != 0) {
      data.forEach(errorObj => {
        const errorRange = [[errorObj.start.line-1,errorObj.start.column],
        [errorObj.end.line-1,errorObj.end.column]]
        const promise = atom.workspace.open(errorObj.file, {activatePane:false})
        promise.then(editor => {
          const rangeMarker = editor.markBufferRange(errorRange, {invalidate:'never'})
          this.markers.push(rangeMarker)
          editor.decorateMarker(rangeMarker, {type: 'line-number', class: 'line-number-error'})
          this.statusView.error("compile errors")
        })
      })
      this.infoPanel.show()
    }
    else
      this.statusView.success("compiled")
  },

  onCompileError(xhr, status,error) {
    if(xhr.status == 500) {
      atom.notifications.addError("InternalServerError.. Restart server and try agin.")
      this.statusView.error("server-error")
    } else {
      atom.notifications.addError("Can't contact server.. Restart server and try agin.")
      this.statusView.error("disconnected")
    }
  },

  createErrorLine(errorObj) {
    const msg = errorObj.message.replace(/\n/g, "<br/>")
    return `<span class="error-line icon icon-alert">
    <span class="error-badge">Error</span> from
    <span class="bold">${errorObj.start.line}:${errorObj.start.column}</span> to
    <span class="bold">${errorObj.end.line}:${errorObj.end.column}</span>
    <span class="bold"></span>: ${msg}</span>`
  },

  saveAllFiles() {
    const editors = atom.workspace.getTextEditors()
    editors.filter(v => this.isModelicaFile(v.getPath())).forEach(editor => {
      console.log("saving file: ", editor.getPath())
      editor.save()
    })
  },

  isModelicaFile(path) { return path.endsWith(".mo") },
  isModelicaScript(path) { return path.endsWith(".mos") },
  clearErrors() {
    this.markers.forEach(marker => marker.destroy())
    this.infoPanel.hide()
  },

  userSavedFile(ev) {
    const path = ev.path
    if(this.isModelicaFile(path) || this.isModelicaScript(path)) {
      this.compileProject()
    }
  }
}

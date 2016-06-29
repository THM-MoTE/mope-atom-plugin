'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import MoieClient from './moie-client'
import * as util from './util'
import { CompositeDisposable, BufferedProcess } from 'atom'

export default {

  config: {
    moieExec: {
      type: 'string',
      default: '/home/user/moie.jar',
      description: 'Full path to moie-server'
    },
    javaExec: {
      type: 'string',
      default: '/usr/bin/java',
      description: 'Full path to java; `whereis java`'
    },
    startServer: {
      type: 'boolean',
      default: false,
      description: 'Start a new instance of moie-server if none running'
    },
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
  triedAsSubprocess: false,

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
      'moie:compile-Project': () => {
        util.saveAllFiles()
        this.compileProject()
      },
      'moie:compile-Script': () => this.compileScript(),
      'moie:stop-Server': () => this.stopServer()
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
        }, (status,error) => {
          if(atom.config.get('Moie.startServer') && !this.triedAsSubprocess) {
            util.startMoieServer(() => this.connect())
            this.triedAsSubprocess = true
          } else {
            atom.notifications.addError(`Couldn't connect Mo|E to the server!`)
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
    const filepath = atom.workspace.getActiveTextEditor().getPath()
    if(util.isModelicaScript(filepath)) {
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

  compileScript() {
    this.clearErrors()
    this.client.compileScript(
      undefined,
      this.onCompileSuccess.bind(this),
      this.onCompileError.bind(this))
  },

  onCompileSuccess(data) {
    const lines = data.map(util.createErrorLine)
    this.infoView.addLines(lines)
    if(lines.length != 0) {
      data.forEach(errorObj => {
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
  }
}

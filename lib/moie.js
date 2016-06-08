'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import MoieClient from './moie-client'
import { CompositeDisposable } from 'atom'

export default {

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,
  projectJson: "project.json",

  consumeStatusBar(statusBar) {
    this.statusView = new StatusView()
    atom.workspace.stta
    this.statusTile = statusBar.addLeftTile({'item': this.statusView.getRoot(), 'priority': 1})
    console.log("added")
    console.log(this.statusTile)
  },

  activate(state) {
    this.infoView = new InfoView(state.infoViewState)
    this.infoPanel = atom.workspace.addBottomPanel({
      item: this.infoView.getRoot(),
      visible: false
    })

    this.client = new MoieClient()
    this.markers = []

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'moie:connect': () => this.connect(),
      'moie:disconnect': () => this.disconnect(),
      'moie:compileProject': () => this.compileProject(),
      'moie:stopServer': () => this.stopServer()
    }))
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
          this.statusView.updateText("connected")
        }, (status,error) => {
          atom.notifications.addError(`Couldn't connect Mo|E to the server because of:\n${error}`)
          this.statusView.updateText("error")
        })
      })
    } else {
      atom.notifications.addError("Can't handle multiple project-roots.\nUse 1 project")
      this.statusView.updateText("error")
    }
  },

  readProjectFileContent(rootDir, onSuccess) {
    const file = rootDir.getFile(this.projectJson)
    if(file.exists() && file.isFile()) {
      const file = rootDir.getFile(this.projectJson)
      file.read(true).then(onSuccess)
    } else {
      atom.notifications.addError(`Please generate a ${this.projectJson} in\n${rootDir.path}`)
      this.statusView.updateText("error")
    }
  },

  disconnect() {
    console.log("disconnect pressed")
    this.client.disconnect(() => {
      atom.notifications.addSuccess("Mo|E disconnected!")
      this.statusView.updateText("disconnected")
      this.infoPanel.hide()
    })
    this.clearErrors()
  },

  stopServer() {
    console.log('stop server')
    this.client.stopServer(() => {
      this.statusView.updateText("disconnected")
      atom.notifications.addSuccess("Server stopped")
    })
    this.clearErrors()
  },

  compileProject() {
    console.log("compileProject pressed")
    this.clearErrors()
    this.client.compile(
      (data) => {
        const lines = data.map(this.createErrorLine)
        this.infoView.addLines(lines)
        if(lines.length != 0) {
          data.forEach(errorObj => {
            const errorPoint = [errorObj.start.line-1,errorObj.start.column]
            const editor = atom.workspace.getActiveTextEditor()
            const marker = editor.markBufferPosition(errorPoint, {invalidate:'never'})
            this.markers.push(marker)
            editor.decorateMarker(marker, {type: 'line-number', class: 'line-number-error'})
          })
          this.infoPanel.show()
        }
        else
          this.statusView.updateText("compiled")
      },
      (xhr, status, error) => {
        console.log(error)
      }
    )
  },

  createErrorLine(errorObj) {
    console.log(errorObj.message)
    return `<span class="error-line">
    <span class="error-badge">Error</span> from
    <span class="bold">${errorObj.start.line}:${errorObj.start.column}</span> to
    <span class="bold">${errorObj.end.line}:${errorObj.end.column}</span>
    <span class="bold"></span>: ${errorObj.message}</span>`
  },

  clearErrors() {
    this.markers.forEach(marker => marker.destroy())
    this.infoPanel.hide()
  }
}

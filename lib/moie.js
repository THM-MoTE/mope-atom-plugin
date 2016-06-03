'use babel'

import InfoView from './info-view'
import StatusView from './status-view'
import { CompositeDisposable } from 'atom'

export default {

  infoView: null,
  statusView: null,
  infoPanel: null,
  statusTile: null,
  subscriptions: null,

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

    // this.statusPanel = atom.workspace.addFooterPanel({
    //   item: this.statusView.getRoot(),
    //   visible: true
    // })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'moie:connect': () => this.connect(),
      'moie:disconnect': () => this.disconnect(),
      'moie:compileProject': () => this.compileProject()
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
    console.log("connect pressed")
    this.infoPanel.show()
  },

  disconnect() {
    console.log("disconnect pressed")
    this.infoPanel.hide()
  },

  compileProject() {
    console.log("compileProject pressed")
  }

}

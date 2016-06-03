'use babel';

import MoieView from './moie-view';
import { CompositeDisposable } from 'atom';

export default {

  moieView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.moieView = new MoieView(state.moieViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.moieView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'moie:connect': () => this.connect(),
      'moie:disconnect': () => this.disconnect(),
      'moie:compileProject': () => this.compileProject()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.moieView.destroy();
  },

  serialize() {
    return {
      moieViewState: this.moieView.serialize()
    };
  },

  connect() {
    console.log("connect pressed")
  },

  disconnect() {
    console.log("disconnect pressed")
  },

  compileProject() {
    console.log("compileProject pressed")
  }

};

'use babel'

const jQuery = require('jquery')
import {SelectListView} from 'atom-space-pen-views'

module.exports = class SelectProjectView extends SelectListView {

  constructor(items) {
    super();
    this.files = items
    console.log("constructor end")
  }

  initialize() {
    super.initialize()
  }

  show() {
    this.setItems(this.files)
    console.log("files ", this.files)
    this.panel = atom.workspace.addModalPanel({item:this})
    this.panel.show()
    this.focusFilterEditor()
  }

  viewForItem(file) {
    return `<li><div class="primary-line" file>${file}</div></li>`
  }

  confirmed(file) {
    console.log("user selected: "+file)
    this.panel.hide()
  }
  cancelled() {
    console.log("user canceled selection")
    this.panel.hide()
  }
}

'use babel'

jQuery = require('jquery')

export default class InfoView {

  constructor(serializedState, fontSize) {
    // Create root element
    this.rootElement = document.createElement('div')
    this.rootElement.classList.add('root-info')
    jQuery(this.rootElement).css('font-size', fontSize+'pt')

    // Create message element
    this.message = document.createElement('div')
    this.message.textContent = 'The MoPE package is Alive! It\'s ALIVE!'
    this.message.classList.add('info-view-message')
    this.rootElement.appendChild(this.message)
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.rootElement.remove()
  }

  getRoot() {
    return this.rootElement
  }

  addLines(lines) {
    const html = lines.reduce((acc, elem) => elem +  "<br/>" + acc, "")
    jQuery(this.message).html(html)
      //setup listener for opening the file with the error
    jQuery(this.message).find("a.filelink").click(ev => {
      const elem = ev.target
      const path = jQuery(elem).data('filepath')
      const line = parseInt(jQuery(elem).data('startline'), 10)
      atom.workspace.open(path, {initialLine:line})
    })
  }
}

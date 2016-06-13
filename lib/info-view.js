'use babel'

jQuery = require('jquery')

export default class InfoView {

  constructor(serializedState) {
    // Create root element
    this.rootElement = document.createElement('div')
    this.rootElement.classList.add('root-info')

    // Create message element
    this.message = document.createElement('div')
    this.message.textContent = 'The Moie package is Alive! It\'s ALIVE!'
    this.message.classList.add('message')
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
  }
}

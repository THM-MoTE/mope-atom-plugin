'use babel'

jQuery = require('jquery')

export default class StatusView {
  constructor() {
    // Create root element
    this.rootElement = document.createElement('div')
    this.rootElement.classList.add('root-status')
    this.rootElement.classList.add('inline-block')
    this.pckname = "Mo|E"
    let msg = document.createElement('span')
    msg.textContent = "Mo|E - OK"
    msg.classList.add('status-msg')
    msg.classList.add('icon')
    this.msg = msg
    this.rootElement.appendChild(msg)
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

  updateText(text) {
    jQuery(this.msg).html(`${this.pckname} - ${text}`)
  }

  success(text) {
    jQuery(this.msg).removeClass('text-error icon-x')
    jQuery(this.msg).addClass('text-success icon-check')
    this.updateText(text)
  }
  error(text) {
    jQuery(this.msg).removeClass('text-success icon-check')
    jQuery(this.msg).addClass('text-error icon-x')
    this.updateText(text)
  }
}

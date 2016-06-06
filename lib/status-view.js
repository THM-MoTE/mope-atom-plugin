'use babel'

import {$} from 'jquery'

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
    let msgElem = $(this.rootElement).find('.status-msg')
    $(msgElem).html(`${this.pckname} - ${text}`)
  }
}

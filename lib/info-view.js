'use babel'

export default class InfoView {

  constructor(serializedState) {
    // Create root element
    this.rootElement = document.createElement('div')
    this.rootElement.classList.add('root-info')

    // Create message element
    const message = document.createElement('div')
    message.textContent = 'The Moie package is Alive! It\'s ALIVE!'
    message.classList.add('message')
    this.rootElement.appendChild(message)
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
}

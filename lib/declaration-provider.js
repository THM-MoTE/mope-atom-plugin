'use babel'

const util = require('./util.js')

export default class DeclarationProvider {

  constructor(client) {
    this.client = client
    this.wordRegex = /([\w\.\-]+)/
  }

  static srcScope() {
    return "source.modelica"
  }

  goToDeclaration() {
    const word = util.wordBelowCursor()
    const {row, column} = util.cursorPosition()
    const position = new util.FilePosition(row, column)
    this.client.getContainingFile(util.currentFile(), position, word)
      .then(filePos => {
        atom.workspace.open(filePos.path, {initialLine: filePos.line-1})
        console.log("success")
      }, (xhr, status, error) => {
        atom.notifications.addWarning("Can't go anywhere ◔_◔ּ", {detail:"Couldn't go to definition of "+word})
        console.log("error")
      })
    console.log("blup")
  }
}

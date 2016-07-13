'use babel'

import * as util from './util'

/* A Suggestionprovider for Atom's autocompelte+;
  See also: https://github.com/atom/autocomplete-plus/wiki/Provider-API
*/
export default {
  setClient(client) {
    this.client = client
    console.log("setting client in provider")
  },

  //scope for suggestions; taken from language-modelica package
  selector: '.source.modelica',
  //don't activate in comment sections
  disableForSelector: '.comment',
  getSuggestions(options) {
    const {editor, bufferPosition, scopeDescriptor, prefix} = options
    const self = this
    const word = util.wordBelowCursor()
    return new Promise(resolve => {
      if(self.client === undefined) {
        //client not connected; do nothing
        resolve([])
      } else {
        //ask server for suggestions
        const position = new util.FilePosition(bufferPosition.row, bufferPosition.column)
        const filepath = editor.getPath()
        self.client.codeCompletion(filepath, position, word, (data) => {
          //map to autocomplete+ "suggestion-object"
          const suggestions = data.map(x => self.createSuggestion(prefix, x))
          resolve(suggestions)
        }, (xhr, status, error) => {
          atom.notifications.addError(xhr.responseText)
          this.statusView.error("server-error")
          resolve([])
        })
      }
    })
  },

  createSuggestion(prefix, dataObj) {
    const text =
      (prefix === '.') ?
      dataObj.name.substring(dataObj.name.lastIndexOf('.')+1) :
      dataObj.name
    console.log("text", text)
    return {
      text: text,
      type: this.getType(dataObj.completionType.toLowerCase()),
      description: dataObj.classComment
    };
  },

  getType(completionType) {
    if(completionType == 'model')
      return 'class'
    else if(completionType == 'package')
      return 'import'
    else
      return completionType
  }
}

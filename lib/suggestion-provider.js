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
    const word = prefix
    return new Promise(resolve => {
      if(self.client === undefined) {
        //client not connected; do nothing
        resolve([])
      } else {
        //ask server for suggestions
        const position = new util.FilePosition(bufferPosition.row, bufferPosition.column)
        const filepath = editor.getPath()
        self.client.codeCompletion(filepath, position, prefix, (data) => {
          //map to autocomplete+ "suggestion-object"
          const suggestions = data.map(x => {
            const suggestion = {
              text: x.name,
              snippet: x.name,
              type: x.completionType.toLowerCase()
            }
            return suggestion
          })
          resolve(suggestions)
        }, (xhr, status, error) => {
          atom.notifications.addError(xhr.responseText)
          this.statusView.error("server-error")
          resolve([])
        })
      }
    })
  }
}

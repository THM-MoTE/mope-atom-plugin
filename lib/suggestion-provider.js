'use babel'

import * as util from './util'

/* A Suggestionprovider for Atom's autocompelte+;
  See also: https://github.com/atom/autocomplete-plus/wiki/Provider-API
*/
export default {
  maxParameterLength: 5,

  setClient(client) {
    this.client = client
    console.log("setting client in autocompleteProvider")
  },

  //scope for suggestions; taken from language-modelica package
  selector: '.source.modelica',
  //don't activate in comment sections
  disableForSelector: '.comment',
  getSuggestions(options) {
    const {editor, bufferPosition, scopeDescriptor, prefix} = options
    const self = this
    const word = util.wordBelowCursor()
    if(self.client === undefined || word === undefined) {
      //client not connected; do nothing
      return Promise.resolve([])
    } else {
      //ask server for suggestions
      const position = new util.FilePosition(bufferPosition.row, bufferPosition.column)
      const filepath = editor.getPath()
      return self.client.codeCompletion(filepath, position, word).
        then((data) => {
          //map to autocomplete+ "suggestion-object"
          const suggestions = data.map(x => self.createSuggestion(word, x))
          return suggestions
        }, (xhr, status, error) => {
          util.displayError(xhr, status)
          return []
        })
    }
  },

  createSuggestion(prefix, dataObj) {
    const lowerCasedType = dataObj.kind.toLowerCase()
    const suggestionObj = {
      type: this.getType(lowerCasedType),
      description: dataObj.classComment,
      replacementPrefix: prefix,
      rightLabel: dataObj.type
    }

    if(lowerCasedType !== "variable" && lowerCasedType !== "property")
      suggestionObj.descriptionMoreURL = this.client.getGoToDocUrl(dataObj.name)

      /*TODO find a solution to display parameter names if suggestion is a right-side expression.
        Meanwhile omit the parameters!
       */
    suggestionObj.text = dataObj.name

    return suggestionObj
  },

  getType(completionType) {
    if(completionType === 'model')
      return 'class'
    else if(completionType === 'package')
      return 'import'
    else
      return completionType
  }
}

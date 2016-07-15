'use babel'

import * as util from './util'
import { Range } from 'atom'

export default {
  wordRegExp: /([\w\.\-_]+)/,
  providerName: "moie-modelica",
  setClient(client) {
    this.client = client
    console.log("setting client in hyperclickProvider")
  },

  getSuggestionForWord(editor, text, range) {
    self = this
    return new Promise((resolve, reject) => {
  	  if(util.isModelicaFile(editor.getPath()) && text.trim() !== "") {
        const className = text
        self.client.getContainingFile(
          className,
          (data) => {
            resolve({
              range:range,
              callback: () => util.openFile(data.path)
            })
          },
          (xhr, status, error) => {
            resolve({
              range: range,
              callback: () => atom.notifications.addWarning("Can't go to anywhere :-(", {detail:`can't find source for ${className}`})
            })
          })
      }
    })
  }
}

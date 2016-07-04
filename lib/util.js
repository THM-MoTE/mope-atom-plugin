'use babel'

import { BufferedProcess } from 'atom'

export default {
  initialDelay: 1000,
  startMoieServer(afterStart) {
    const self=this
    const execPath = atom.config.get('Moie.moieExec')
    const interface = atom.config.get('Moie.interface')
    const port = atom.config.get('Moie.port')
    const command = atom.config.get('Moie.javaExec')
    const args = ['-jar', execPath]
    const stdout = data => {
      if(data.indexOf(`Server running at ${interface}:${port}`) > -1) {
        //wait a vew seconds until server is loaded
        window.setTimeout(afterStart, self.initialDelay)
      }
      console.log("stdout", data)
    }
    const stderr = data => console.log("stderr", data)
    const exit = code => console.log("server exited with ", code)
    const process = new BufferedProcess({command,args, stdout, stderr, exit})
  },

  createErrorLine(errorObj) {
    const msg = errorObj.message.replace(/\n/g, "<br/>")
    const cssClass = errorObj.type == 'Warning' ? 'warning-badge' : 'error-badge'
    return `<span class="error-line icon icon-alert">
    <span class="${cssClass}">${errorObj.type}</span> from
    <span class="bold">${errorObj.start.line}:${errorObj.start.column}</span> to
    <span class="bold">${errorObj.end.line}:${errorObj.end.column}</span>
    <span class="bold"></span>: ${msg}</span>`
  },

  saveAllFiles() {
    const editors = atom.workspace.getTextEditors()
    editors.filter(v => this.isModelicaFile(v.getPath())).forEach(editor => {
      editor.save()
    })
  },

  currentFile() {
    return atom.workspace.getActiveTextEditor().getPath()
  },

  isModelicaFile(path) { return path.endsWith(".mo") },
  isModelicaScript(path) { return path.endsWith(".mos") }
}

'use babel'

import { BufferedProcess, Point, Range } from 'atom'

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
      if(data.indexOf("Server running at") > -1) {
        //wait a vew seconds until server is loaded
        window.setTimeout(afterStart, self.initialDelay)
      }
      console.log("stdout", data)
    }
    const stderr = data => atom.notifications.addError("Mo|E-Server process error", {detail:data})
    const exit = code => console.log("server exited with ", code)
    const process = new BufferedProcess({command,args, stdout, stderr, exit})
  },

  createErrorLine(errorObj) {
      //link to file
    const fileName = errorObj.file.substring(errorObj.file.lastIndexOf("/")+1)
    const fileElem = (errorObj.file !== "") ?
      `<a href="#"
        data-filepath="${errorObj.file}"
        data-startline="${errorObj.start.line}"
        class="filelink">
        ${fileName}
      </a>` : "";

      //HTML linebreaks
    const msg = errorObj.message.replace(/\n/g, "<br/>")
      //badge indicator
    const cssClass = errorObj.type == 'Warning' ? 'warning-badge' : 'error-badge'
      //final error indicator line
    return `<span class="error-line icon icon-alert">
    <span class="${cssClass}">${errorObj.type}</span>
    ${fileElem} from
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

  wordBelowCursor() {
    const editor = atom.workspace.getActiveTextEditor()
    const buffer = editor.getBuffer()
    const cursorPos = editor.getCursorBufferPosition()
    return this.wordBefore(cursorPos, buffer)
  },

  wordBelowPosition(position, buffer) {
    return this.wordBefore(position, buffer) + this.wordAfter(position, buffer)
  },

  wordBefore(pos, textBuffer) {
    let startPos = new Point(pos.row,pos.column-1)
    let word = textBuffer.getTextInRange(new Range(startPos, pos))
    while(!word.startsWith(" ") && startPos.column !=0) {
      startPos = new Point(startPos.row, startPos.column-1)
      word = textBuffer.getTextInRange(new Range(startPos, pos))
    }
    return word.trim()
  },

  wordAfter(pos, textBuffer) {
    let endPos = new Point(pos.row,pos.column+1)
    let word = textBuffer.getTextInRange(new Range(pos, endPos))
    const lineLength = textBuffer.lineLengthForRow(pos.row)
    while(!word.endsWith(" ") && !word.endsWith("\n") && endPos.column < lineLength) {
      endPos = new Point(endPos.row, endPos.column+1)
      word = textBuffer.getTextInRange(new Range(pos, endPos))
    }
    return word.trim()
  },

  rangeBelowPosition(pos, buffer) {
    let startPos = new Point(pos.row, pos.column-1)
    let word = buffer.getTextInRange(new Range(startPos, pos))
    while(!word.startsWith(" ") && startPos.column !=0) {
      startPos = new Point(startPos.row, startPos.column-1)
      word = buffer.getTextInRange(new Range(startPos, pos))
    }

    let endPos = new Point(pos.row, pos.column+1)
    word = buffer.getTextInRange(new Range(pos, endPos))
    while(!word.endsWith(" ") && !word.endsWith("\n")) {
      endPos = new Point(endPos.row, endPos.column+1)
      word = buffer.getTextInRange(new Range(pos, endPos))
    }

    return new Range(startPos, endPos)
  },
  isModelicaFile(path) { return path.endsWith(".mo") },
  isModelicaScript(path) { return path.endsWith(".mos") },
  openFile(path) {
    atom.workspace.open(path)
  },

  FilePath(path) {
    this.path = path;
  },

  FilePosition(line, column) {
    this.line = line
    this.column = column
  }
}

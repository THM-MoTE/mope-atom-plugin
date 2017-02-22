'use babel'

import { BufferedProcess, Point, Range } from 'atom'
const electron = require('electron')

export default {
  initialDelay: 1000,

  serverExitCodes: {
    CONFIG_ERROR: 2,
    UNMODIFIED_CONFIG: 1
  },
  getConfigPath() {
    return electron.remote.app.getPath("home") + "/.mope/mope.conf"
  },
  getLogPath() {
    return electron.remote.app.getPath("home") + "/.mope/mope-server.log"
  },
  openConfig() {
    const configPath = this.getConfigPath()
    console.log(configPath)
    atom.workspace.open(configPath)
  },
  startMoieServer(afterStart) {
    const self=this
    const execPath = atom.config.get('MoPE.mopeExec')
    const mopeInterface = atom.config.get('MoPE.interface')
    const port = atom.config.get('MoPE.port')
    const command = atom.config.get('MoPE.javaExec')
    const args = ['-jar', execPath]
    const stdout = data => {
      if(data.indexOf("Server running at") > -1) {
        //wait a vew seconds until server is loaded
        window.setTimeout(afterStart, self.initialDelay)
      }
    }
    const stderr = data => atom.notifications.addError("Mo|E-Server process error", {detail:data})
    const exit = code => {
      const logFileHint = `check the logfile at: ${this.getLogPath()} to see what is wrong.`
      const options = {
        dismissable: false
      }
      switch(code) {
        case 0: break
        case this.serverExitCodes.CONFIG_ERROR:
          options.detail =
            "Your configuration is invalid. Please adjust the settings.\n"+
            logFileHint
          atom.notifications.addError("Mo|E exited abnormally", options)
          this.openConfig()
          break
        case this.serverExitCodes.UNMODIFIED_CONFIG:
          options.detail =
            "Your configuration got newly created. Please adjust the settings.\n"
          atom.notifications.addError("Mo|E exited abnormally", options)
          this.openConfig()
          break
        default:
        console.log("WARNING: mope-server exited abnormally with:", code)
      }
    }
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
    return (atom.workspace.getActiveTextEditor() !== undefined) ?
      atom.workspace.getActiveTextEditor().getPath() : undefined
  },

  withCurrentFile(msg, fn) {
    const file = this.currentFile()
    if(file !== undefined) fn(file)
    else atom.notifications.addError(
      "Please open a file first!",
      {detail: msg})
  },

  cursorPosition() {
    const editor = atom.workspace.getActiveTextEditor()
    const buffer = editor.getBuffer()
    return editor.getCursorBufferPosition()
  },

  wordBelowCursor() {
    const buffer = atom.workspace.getActiveTextEditor().getBuffer()
    return this.wordBelowPosition(this.cursorPosition(), buffer)
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

  displayError(xhr, status) {
    if(xhr.responseText !== undefined)
      atom.notifications.addError(xhr.responseText)
    else if(xhr.status == 500) {
      atom.notifications.addError("InternalServerError.. Restart server and try agin.")
    } else if(xhr.status == 404) {
      atom.notifications.addError(xhr.responseText)
    }
    else {
      atom.notifications.addError("Can't contact server.. Restart server and try agin.")
    }
  },

  FilePath(path) {
    this.path = path;
  },

  FilePosition(line, column) {
    this.line = line
    this.column = column
  }
}

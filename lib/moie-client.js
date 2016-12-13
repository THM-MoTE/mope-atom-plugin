'use babel'

jQuery = require('jquery')
import { FilePath, ajaxPromise} from './util'
import * as shell from 'shell'

export default class MoieClient {
  constructor(servername, port) {
    port = (port === undefined) ? 9001 : port
    servername = (servername === undefined) ? 'localhost' : servername
    this.baseAddress = "http://" + servername + ":" + port + "/" + "mope/"
    this.projectBaseAddress = this.baseAddress + "project/"
    this.mimeType = 'application/json'
    this.connected = false
  }

  connect(projectInfo) {
    const self = this
    const json = (typeof projectInfo === 'string') ? projectInfo : JSON.stringify(projectInfo)
    return jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'connect',
      contentType: this.mimeType,
      data: json
    }).then(
      (data, status, xhr) => {
        self.projectId = data
        self.connected = true
      })
  }

  disconnect() {
    if(this.connected) {
      this.connected = false
      return jQuery.ajax({
        method: 'POST',
        url: this.projectBaseAddress + `${this.projectId}/disconnect`,
        error: (xhr, status, error) => {
          console.log("error disconnect: "+error)
        }
      })
    } else return Promise.reject("not connected")
  }

  stopServer() {
    return jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'stop-server',
      error: (xhr, status, error) => {
        console.log("error stop-server: "+error)
      }
    })
  }

  compile(openedFile) {
    const json = JSON.stringify(new FilePath(openedFile))
    if(this.connected) {
      return jQuery.ajax({
        method: 'POST',
        dataType: 'json',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/compile`,
      })
    } else return Promise.reject("not connected")
  }

  compileScript(scriptFile) {
    if(this.connected && scriptFile != undefined) {
      const json = JSON.stringify(new FilePath(scriptFile))
      return jQuery.ajax({
        method: 'POST',
        dataType: 'json',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/compileScript`,
      })
    } else if(this.connected) {
      return jQuery.ajax({
        method: 'GET',
        url: this.projectBaseAddress + `${this.projectId}/compileScript`,
      })
    } else return Promise.reject("not connected")
  }

  checkModel(openedFile) {
    const json = JSON.stringify(new FilePath(openedFile))
    if(this.connected) {
      return jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/checkModel`
      })
    } else return Promise.reject("not connected")
  }

  codeCompletion(file, position, word) {
    const json = JSON.stringify({
      file: file,
      position: position,
      word: word
    })
    if(this.connected) {
      return jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        dataType: 'json',
        url: this.projectBaseAddress + `${this.projectId}/completion`
      })
    } else return Promise.reject("not connected")
  }

  getContainingFile(className) {
    if(this.connected) {
      return jQuery.ajax({
        method: 'GET',
        dataType: 'json',
        url: this.projectBaseAddress + `${this.projectId}/declaration?class=${className}`
      })
    } else return Promise.reject("not connected")
  }

  getGoToDocUrl(word) {
    return this.projectBaseAddress +
      `${this.projectId}/doc?class=${word}`
  }

  goToDoc(word) {
    const url = this.getGoToDocUrl(word)
    shell.openExternal(url)
  }

  getType(file, position, word) {
    const json = JSON.stringify({
      file: file,
      position: position,
      word: word
    })
    if(this.connected) {
      return jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        dataType: 'json',
        url: this.projectBaseAddress + `${this.projectId}/typeOf`
      })
    } return Promise.reject("not connected")
  }
}

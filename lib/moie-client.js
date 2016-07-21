'use babel'

jQuery = require('jquery')
import { FilePath } from './util'
import * as shell from 'shell'

export default class MoieClient {
  constructor(servername, port) {
    port = (port === undefined) ? 9001 : port
    servername = (servername === undefined) ? 'localhost' : servername
    this.baseAddress = "http://" + servername + ":" + port + "/" + "moie/"
    this.projectBaseAddress = this.baseAddress + "project/"
    this.mimeType = 'application/json'
    this.connected = false
  }

  connect(projectInfo, onSuccess, onError) {
    const self = this
    const json = (typeof projectInfo === 'string') ? projectInfo : JSON.stringify(projectInfo)
    jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'connect',
      contentType: this.mimeType,
      data: json,
      success: (data, status, xhr) => {
        self.projectId = data
        self.connected = true
        onSuccess()
      },
      error: (xhr, status, error) => {
        onError(status,error)
      }
    })
  }

  disconnect(onSuccess) {
    if(this.connected) {
      jQuery.ajax({
        method: 'POST',
        url: this.projectBaseAddress + `${this.projectId}/disconnect`,
        success: onSuccess,
        error: (xhr, status, error) => {
          console.log("error disconnect: "+error)
        }
      })
      this.connected = false
    } else onSuccess()
  }

  stopServer(onSuccess) {
    jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'stop-server',
      success: onSuccess,
      error: (xhr, status, error) => {
        console.log("error stop-server: "+error)
      }
    })
  }

  compile(openedFile, onSuccess, onError) {
    const json = JSON.stringify(new FilePath(openedFile))
    if(this.connected) {
      jQuery.ajax({
        method: 'POST',
        dataType: 'json',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/compile`,
        success: onSuccess,
        error: onError
      })
    }
  }

  compileScript(scriptFile, onSuccess, onError) {
    if(this.connected && scriptFile != undefined) {
      const json = JSON.stringify(new FilePath(scriptFile))
      jQuery.ajax({
        method: 'POST',
        dataType: 'json',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/compileScript`,
        success: onSuccess,
        error: onError
      })
    } else if(this.connected) {
      jQuery.ajax({
        method: 'GET',
        url: this.projectBaseAddress + `${this.projectId}/compileScript`,
        success: onSuccess,
        error: onError
      })
    }
  }

  checkModel(openedFile, onSuccess, onError) {
    const json = JSON.stringify(new FilePath(openedFile))
    if(this.connected) {
      jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        url: this.projectBaseAddress + `${this.projectId}/checkModel`,
        success: onSuccess,
        error: onError
      })
    }
  }

  codeCompletion(file, position, word, onSuccess, onError) {
    const json = JSON.stringify({
      file: file,
      position: position,
      word: word
    })
    if(this.connected) {
      jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        dataType: 'json',
        url: this.projectBaseAddress + `${this.projectId}/completion`,
        success: onSuccess,
        error: onError
      })
    }
  }

  getContainingFile(className, onSuccess, onError) {
    const json = JSON.stringify({
      className:className
      })
    if(this.connected) {
      jQuery.ajax({
        method: 'POST',
        contentType: this.mimeType,
        data: json,
        dataType: 'json',
        url: this.projectBaseAddress + `${this.projectId}/declaration`,
        success: onSuccess,
        error: onError
      })
    }
  }

  goToDoc(word) {
    const url = this.projectBaseAddress +
      `${this.projectId}/doc?class=${word}`
    shell.openExternal(url)
  }
}

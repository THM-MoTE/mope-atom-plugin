'use babel'

jQuery = require('jquery')

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

  compile(onSuccess, onError) {
    jQuery.ajax({
      method: 'POST',
      dataType: 'json',
      url: this.projectBaseAddress + `${this.projectId}/compile`,
      success: onSuccess,
      error: onError
    })
  }

  compileScript(scriptFile, onSuccess, onError) {
    const json = JSON.stringify({
      "path": scriptFile
    })
    jQuery.ajax({
      method: 'POST',
      dataType: 'json',
      contentType: this.mimeType,
      data: json,
      url: this.projectBaseAddress + `${this.projectId}/compileScript`,
      success: onSuccess,
      error: onError
    })
  }
}

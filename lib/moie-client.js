'use babel'

jQuery = require('jquery')

export default class MoieClient {
  constructor(servername, port) {
    port = (port === undefined) ? 9001 : port
    servername = (servername === undefined) ? 'localhost' : servername
    this.baseAddress = "http://" + servername + ":" + port + "/" + "moie/"
    this.mimeType = 'application/json'
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
        console.log(data)
        self.projectId = data
        onSuccess()
      },
      error: (xhr, status, error) => {
        console.log(error)
        onError(status,error)
      }
    })
  }

  disconnect(onSuccess) {
    jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'disconnect?project-id='+this.projectId,
      success: onSuccess,
      error: (xhr, status, error) => {
        console.log("error disconnect: "+error)
      }
    })
  }

  compile(onSuccess, onError) {
    jQuery.ajax({
      method: 'POST',
      dataType: this.mimeType,
      url: this.baseAddress + 'compile?project-id='+this.projectId,
      success: onSuccess,
      error: onError
    })
  }
}

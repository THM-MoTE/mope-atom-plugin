'use babel'

jQuery = require('jquery')

export default class MoieClient {
  constructor(servername, port) {
    port = (port === undefined) ? 9001 : port
    servername = (servername === undefined) ? 'localhost' : servername
    this.baseAddress = "http://" + servername + ":" + port + "/" + "moie/"
  }

  connect(projectInfo, onSuccess, onError) {
    const self = this
    const json = (typeof projectInfo === 'string') ? projectInfo : JSON.stringify(projectInfo)
    jQuery.ajax({
      method: 'POST',
      url: this.baseAddress + 'connect',
      contentType: 'application/json',
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
}

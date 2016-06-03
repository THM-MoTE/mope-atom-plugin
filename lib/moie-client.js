'use babel'

import {$} from 'jquery'

export default class MoieClient {
  constructor(servername, port) {
    port = (port === undefined) ? 9001 : port
    servername = (servername === undefined) ? 'localhost' : servername
    this.baseAddress = "http://" + this.servername + ":" + this.port + "/" + "moie/"
  }

  connect(projectInfo) {
    const self = this
    const json = (typeof projectInfo === 'string') ? projectInfo : JSON.stringify(projectInfo)

    $.ajax({
      method: 'POST',
      url: this.baseAddress + 'connect',
      contentType: 'application/json',
      data: json,
      success: (data, status, xhr) => {
        console.log(data)
        self.projectId = data
      },
      error: (xhr, status, error) => {
        console.log(error)
      }
    })
  }
}

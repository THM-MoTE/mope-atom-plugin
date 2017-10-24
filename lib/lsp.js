const net = require('net')
const cp = require('child_process')
const {AutoLanguageClient} = require('atom-languageclient')

class ModelicaLanguageClient extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.modelica' ] }
  getLanguageName () { return 'Modelica' }
  getServerName () { return 'ModelicaLsp' }
  getConnectionType() { return 'socket' }

  constructor () {
    super()
    atom.config.set('core.debugLSP', true)
    console.log("constructor called")
  }

  startServerProcess () {
    const self = this
    console.log("serverProcess called")
    const args = ["-jar", "/home/nico/Downloads/mope-server-0.6.2.jar"]
    const client = new net.Socket()
    //TODO: fix this for production
    const childProcess = cp.spawn("/usr/bin/java", args)
    return new Promise((resolve,reject) => {
      console.log("connecting")
      client.connect(9010, '127.0.0.1', () => {
        self.socket = client
        console.log("connection opened")
        resolve(childProcess)
      })
    })
  }
}

module.exports = new ModelicaLanguageClient()

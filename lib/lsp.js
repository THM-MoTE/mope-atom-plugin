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
    this.config = require('./config.js')
  }

  startServerProcess () {
    const self = this
    console.log("serverProcess called")
    const port = atom.config.get('MoPE.port')
    const args = [
      "-jar", atom.config.get('MoPE.mopeExec'),
      "--protocol", "lsp",
      "--port", port
    ]
    const client = new net.Socket()
    //TODO: fix this for production
    const childProcess = cp.spawn(atom.config.get('MoPE.javaExec'), args)
    return new Promise((resolve,reject) => {
      console.log("connecting")
      client.connect(port, 'localhost', () => {
        self.socket = client
        console.log("connection opened")
        resolve(childProcess)
      })
    })
  }
}

module.exports = new ModelicaLanguageClient()

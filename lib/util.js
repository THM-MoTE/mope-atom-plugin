'use babel'

import { BufferedProcess } from 'atom'

export default {
  initialDelay: 3000,
  startMoieServer(afterStart) {
    const self=this
    const execPath = atom.config.get('Moie.moieExec')
    const interface = atom.config.get('Moie.interface')
    const port = atom.config.get('Moie.port')
    const command = '/usr/bin/java'
    const args = ['-jar', execPath]
    const stdout = data => {
      if(data.indexOf(`Server running at ${interface}:${port}`) > -1) {
        //wait a vew seconds until server is loaded
        window.setTimeout(afterStart, self.initialDelay)
      }
      console.log("stdout", data)
    }
    const stderr = data => console.log("stderr", data)
    const exit = code => console.log("server exited with ", code)
    const process = new BufferedProcess({command,args, stdout, stderr, exit})
  }
}

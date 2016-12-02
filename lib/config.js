'use babel'

export default {
  mopeExec: {
    type: 'string',
    default: '/home/user/mope.jar',
    description: 'Full path to mope-server'
  },
  javaExec: {
    type: 'string',
    default: '/usr/bin/java',
    description: 'Full path to java; `whereis java`'
  },
  startServer: {
    type: 'boolean',
    default: false,
    description: 'Start a new instance of mope-server if none running'
  },
  interface: {
    type: "string",
    default: "localhost"
  },
  port: {
    type: "integer",
    default: 9001
  },
  compileMode: {
    type: 'string',
    default: 'while typing',
    enum: [
      'on demand',
      'while typing'
    ]
  },
  statusViewFontSize: {
    type: 'integer',
    default: 8,
    description: 'Font size of the status view in pt'
  }
}

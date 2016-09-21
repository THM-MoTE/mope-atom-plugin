'use babel'

export default {
  moieExec: {
    type: 'string',
    default: '/home/user/moie.jar',
    description: 'Full path to moie-server'
  },
  javaExec: {
    type: 'string',
    default: '/usr/bin/java',
    description: 'Full path to java; `whereis java`'
  },
  startServer: {
    type: 'boolean',
    default: false,
    description: 'Start a new instance of moie-server if none running'
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
  }
}

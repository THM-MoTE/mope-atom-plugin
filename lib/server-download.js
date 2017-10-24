'use babel'

import DownloadManager from './downloads.js'
request = require('request')
fs = require('fs')
os = require('os')
import {File} from 'atom'

export default class ServerDownloader extends DownloadManager {
	static serverVersion() {
		return "0.6.2"
	}
	static defaultServerFile() {
		return `${os.homedir()}/.mope/mope-server-${ServerDownloader.serverVersion()}.jar`
	}
	constructor(progressHandler) {
		const megabyte = 1000000
		super(24.3*megabyte, progressHandler)
		this.releaseUri = `https://github.com/THM-MoTE/mope-server/releases/download/v${ServerDownloader.serverVersion()}/mope-server-${ServerDownloader.serverVersion()}.jar`
		//FIXME: use ~/.config/mope instead of ~/.mope ones server support it
		this.targetFile = ServerDownloader.defaultServerFile()
		console.log(this.targetFile)
		console.log(this.releaseUri)
		this.fileObj = new File(this.targetFile)
	}

	download() {
		const self = this
		console.log("path ", this.targetFile, " obj ", this.fileObj)
		return this.fileObj.exists()
			.then(exists => {
				if(exists && self.fileObj.isFile())
					return self.fileObj
				else
					return super.downloadFile(this.releaseUri, this.targetFile)
			})
	}
}

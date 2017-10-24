'use babel'

request = require('request')
fs = require('fs')
import {File} from 'atom'

export default class DownloadManager {
	constructor(targetFileSize, progressHandler) {
		this.fileSize = targetFileSize
		this.progressHandler = progressHandler
	}

	downloadFile(uri, targetFileName) {
		return new Promise((resolve, reject) => {
			console.log("download uri: ",uri, " target: ", targetFileName)
			const self = this
			let percent = 0
			request.get(uri)
				.on('data', data => {
					percent += data.length / self.fileSize
					self.progressHandler((percent>=1) ? 1 : percent)
				})
				.on('error', data => {
					self.progressHandler(data)
					self.reject(data)
					console.log("error while download ", data)
				})
				.pipe(fs.createWriteStream(targetFileName))
				.on('finish', () => resolve(new File(self.targetFileName)))
			})
	}
}

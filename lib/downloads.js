'use babel'

request = require('request')
fs = require('fs')

export default class DownloadManager {
	constructor(targetFileSize, progressHandler) {
		this.fileSize = targetFileSize
		this.progressHandler = progressHandler
	}

	downloadFile(uri, targetFileName) {
		const self = this
		let percent = 0
		request.get(uri)
			.on('data', data => {
				percent += data.length / self.fileSize
				console.log("chunk size: ", data.length, " percent: ", percent)
				self.progressHandler((percent>=1) ? 1 : percent)
			})
			.on('error', data => {
				self.progressHandler(data)
				console.log("error while download ", data)
			})
			// .on('response', data => {
			// 	console.log("download finished")
			// })
			.pipe(fs.createWriteStream(targetFileName))
	}
}

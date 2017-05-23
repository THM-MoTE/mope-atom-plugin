'use babel'

request = require('request')
fs = require('fs')

export default class DownloadManager {
	constructor(targetFileSize) {
		this.fileSize = targetFileSize
	}

	downloadFile(uri, targetFileName) {
		const self = this
		let percent = 0
		request.get(uri)
			.on('data', data => {
				percent += self.fileSize / data.length
				console.log("chunk size: ", data.length, " percent: ", percent)
			})
			.on('error', data => {
				console.log("error while download ", data)
			})
			// .on('response', data => {
			// 	console.log("download finished")
			// })
			.pipe(fs.createWriteStream(targetFileName))
	}
}

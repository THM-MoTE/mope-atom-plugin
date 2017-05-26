'use babel'

export default {
	serverVersion() { return "0.6.2" },
	releaseUri() {
		return `https://github.com/THM-MoTE/mope-server/releases/download/v${this.serverVersion()}/mope-server-${this.serverVersion()}.jar`
	}
}

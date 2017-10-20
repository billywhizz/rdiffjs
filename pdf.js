const { WritableStream } = require('memory-streams')
const { createReader, createWriter } = require('hummus')
const fs = require('fs')

class PDFStreamForResponse {
	constructor(inResponse) {
		this.response = inResponse
		this.position = 0
	}

	write(inBytesArray) {
		if (inBytesArray.length > 0) {
			this.response.write(new Buffer(inBytesArray))
			this.position += inBytesArray.length
			return inBytesArray.length
		}
		return 0
	}

	getCurrentPosition() {
		return this.position
	}
}

class PDFWStreamForFile {
	constructor(inPath) {
		this.ws = fs.createWriteStream(inPath)
		this.position = 0
		this.path = inPath
	}

	write(inBytesArray) {
		if (inBytesArray.length > 0) {
			this.ws.write(new Buffer(inBytesArray))
			this.position += inBytesArray.length
			return inBytesArray.length
		}
		return 0
	}

	getCurrentPosition() {
		return this.position
	}

	close(inCallback) {
		if (this.ws) {
			this.ws.end(() => {
				this.ws = null
				if (inCallback) inCallback()
			})
		} else if (inCallback) inCallback()
	}
}

class PDFRStreamForFile {
	
		constructor(inPath) {
			this.rs = fs.openSync(inPath,'r')
			this.path = inPath
			this.rposition = 0
			this.fileSize = fs.statSync(inPath)["size"]
		}
	
		read(inAmount) {
			var buffer = new Buffer(inAmount*2)
			var bytesRead = fs.readSync(this.rs, buffer, 0, inAmount,this.rposition)
			var arr = []
	
			for (var i=0; i<bytesRead; ++i)
					arr.push(buffer[i])
			this.rposition+=bytesRead
			return arr
		}
	
		notEnded() {
			return this.rposition < this.fileSize
		}
	
		setPosition(inPosition) {
			this.rposition = inPosition
		}
	
		setPositionFromEnd(inPosition) {
			this.rposition = this.fileSize-inPosition
		}
	
		skip(inAmount) {
			this.rposition += inAmount
		}
	
		getCurrentPosition() {
			return this.rposition
		}
	
		close(inCallback) {
			fs.close(this.rs,inCallback)
		}
	}
	
class PDFWStreamForBuffer {

	constructor(stream) {
		this.stream = stream
		this.position = 0
	}

	getCurrentPosition() {
		return this.position
	}

	write(byteArray) {
		if (!byteArray.length) return 0
		this.stream.write(new Buffer(byteArray))
		this.position += byteArray.length
		return byteArray.length
	}

}

class PDFRStreamForBuffer {

	constructor(buffer) {
		this.innerBuffer = buffer
		this.rposition = 0
		this.fileSize = buffer.byteLength
	}

	read(inAmount) {
		const pos = this.rposition
		this.rposition += inAmount
		return [...this.innerBuffer.slice(pos, pos + inAmount)]
	}

	notEnded() {
		return this.rposition < this.fileSize
	}

	setPosition(inPosition) {
		this.rposition = inPosition
	}

	setPositionFromEnd(inPosition) {
		this.rposition = this.fileSize - inPosition
	}

	skip(inAmount) {
		this.rposition += inAmount
	}

	getCurrentPosition() {
		return this.rposition
	}

}

function split(base64) {
	return new Promise(resolve => {
		const start = Date.now()
		const buffer = new Buffer(base64, 'base64')
		const pdfReader = createReader(new PDFRStreamForBuffer(buffer))
		const pageCount = pdfReader.getPagesCount()
		let nextPage = 0
		const pages = []
		while (nextPage < pageCount) {
			const outStream = new WritableStream()
			const pdfWriter = createWriter(new PDFStreamForResponse(outStream))
			pdfWriter.createPDFCopyingContext(pdfReader).appendPDFPageFromPDF(nextPage)
			pdfWriter.end()
			outStream.end()
			pages.push(outStream.toBuffer('base64'))
			nextPage++
		}
		resolve({
			pages,
			time: Date.now() - start
		})
	})
}

function info(base64) {
	return new Promise(resolve => {
		const buffer = new Buffer(base64, 'base64')
		const pdfReader = createReader(new PDFRStreamForBuffer(buffer))
		const pageCount = pdfReader.getPagesCount()
		const level = pdfReader.getPDFLevel()
		const trailer = pdfReader.getTrailer()
		const objects = pdfReader.getObjectsCount()
		const encrypted = pdfReader.isEncrypted()
		let nextPage = 0
		const pages = []
		while (nextPage < pageCount) {
			const page = pdfReader.parsePage(nextPage)
			const dictionary = page.getDictionary()
			pages.push({
				media: page.getMediaBox(),
				crop: page.getCropBox(),
				trim: page.getTrimBox(),
				bleed: page.getBleedBox(),
				art: page.getArtBox(),
				rotation: page.getRotate(),
				keys: Object.keys(dictionary)
			})
			nextPage++
		}
		resolve({ pageCount, level, trailer, objects, encrypted, pages })
	})
}

function countPages(base64) {
	return new Promise(resolve => {
		const buffer = new Buffer(base64, 'base64')
		const pdfReader = createReader(new PDFRStreamForBuffer(buffer))
		const pageCount = pdfReader.getPagesCount()
		resolve(pageCount)
	})
}

function duplicate(buffer, times) {
	return new Promise(resolve => {
		const pdfReader = createReader(new PDFRStreamForBuffer(buffer))
		const pageCount = pdfReader.getPagesCount()
		const outStream = new WritableStream()
		const pdfWriter = createWriter(new PDFStreamForResponse(outStream))
		const context = pdfWriter.createPDFCopyingContext(pdfReader)
		let copies = times + 1
		while (copies--) {
			let nextPage = 0
			while (nextPage < pageCount) {
				context.appendPDFPageFromPDF(nextPage)
				nextPage++
			}
		}
		pdfWriter.end()
		outStream.end()
		resolve(outStream.toBuffer())
	})
}

module.exports = {
	split,
	duplicate,
	countPages,
	info,
	createReader,
	createWriter,
	PDFWStreamForBuffer,
	PDFRStreamForBuffer,
	PDFWStreamForFile,
	PDFStreamForResponse,
	PDFRStreamForFile
}

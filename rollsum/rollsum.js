
const { fstat, open, read } = require('fs')
const assert = require('assert')
const { promisify } = require('util')

const fstatAsync = promisify(fstat)
const openAsync = promisify(open)
const readAsync = promisify(read)

async function run(fn) {
	const b = new Buffer(2048)
	const fd = await openAsync(fn, 'r')
	const stat = await fstatAsync(fd)
	let { size } = stat
	let off = 0
	let check = 0
	while (size) {
		const chunk = await readAsync(fd, b, 0, 2048, off)
		if (chunk.bytesRead < 2048) {
			check = rollSum1(b.slice(0, chunk.bytesRead))
		} else {
			check = rollSum1(b)		
		}
		console.log(check)
		off += chunk.bytesRead
		size -= chunk.bytesRead
	}
}

async function stress1(fn, fun, runs = 100000) {
	const buffers = []
	const fd = await openAsync(fn, 'r')
	const stat = await fstatAsync(fd)
	let { size } = stat
	let off = 0
	let check = 0
	while (size) {
		const b = new Buffer(2048)
		const chunk = await readAsync(fd, b, 0, 2048, off)
		if (chunk.bytesRead < 2048) {
			buffers.push(b.slice(0, chunk.bytesRead))
		} else {
			buffers.push(b)
		}
		off += chunk.bytesRead
		size -= chunk.bytesRead
	}
	const start = Date.now()
	let blen = buffers.length
	let total = 0
	while (runs--) {
		let i = 0
		while (i < blen) {
			total += fun(buffers[i++])		
		}
	}
	console.log(total)
	console.log(Date.now() - start)
}

async function stress2(fn, fun, runs = 100000) {
	const fd = await openAsync(fn, 'r')
	const stat = await fstatAsync(fd)
	const b1 = new Buffer(2048)
	const b2 = new Buffer(2048)
	const b3 = new Buffer(2048)
	const b4 = new Buffer(1801)
	await readAsync(fd, b1, 0, 2048, 0)
	await readAsync(fd, b2, 0, 2048, 2048)
	await readAsync(fd, b3, 0, 2048, 4096)
	await readAsync(fd, b4, 0, 1801, 6144)
	const start = Date.now()
	while (runs--) {
		assert(fun(b1) === 4025106459);
		assert(fun(b2) === 307646824);
		assert(fun(b3) === 977512073);
		assert(fun(b4) === 3918749721);
	}
	console.log(Date.now() - start)
}

function rollSum1(data) {
	let A = 0;
	let B = 0;
	const len = data.length;
	for (let i = 0; i < len; i++) {
		A += data[i] + 31;
		B += A;
	}
	const v1 = (A & 0xffff)
	const v2 = ((B & 0xffff) * 65536)
	return v1 + v2;
}

function rollSum2(data) {
	let A = 0;
	let B = 0;
	data.forEach(b => {
		A += b + 31;
		B += A;
	});
	const v1 = (A & 0xffff)
	const v2 = ((B & 0xffff) * 65536)
	return v1 + v2;
}

/*
100000 runs, 4 buffers

python 57 seconds
stress1/rollsum2 = 16.8 seconds
stress2/rollsum2 = 16.3 seconds
stress1/rollsum1 = 1.7 seconds
stress2/rollsum1 = 1.5 seconds
c 0.7 seconds
asm.js 0.7 seconds (wrong results!)
*/

stress2('./small.pdf', rollSum1).catch(err => console.error(err))

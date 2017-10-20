const { fstat, open, read } = require('fs')
const assert = require('assert')
const { promisify } = require('util')
const Module = require('./roller')
const _rollSum3 = Module._rollsum
const _rollSum2 = Module.cwrap('rollsum', 'number', ['array', 'number'])

const fstatAsync = promisify(fstat)
const openAsync = promisify(open)
const readAsync = promisify(read)

function rollSum3(b) {
	const len = b.length
	const bb = Module._malloc(len);
	Module.HEAPU8.set(b, bb);
	const r = _rollSum3(bb, len) >>> 0
	Module._free(bb);
	return r
}

function rollSum2(b) {
	return _rollSum2(b, b.length) >>> 0
}

function rollSum1(data) {
	let A = 0
	let B = 0
	const len = data.length;
	for (let i = 0; i < len; i++) {
		A += data[i] + 31
		B += A
	}
	const v1 = (A & 0xffff)
	const v2 = ((B & 0xffff) * 65536)
	return v1 + v2 >>> 0
}

/*
100000 runs, 4 buffers
python 57 seconds
rollsum1 = 1.6 seconds
rollsum2 = 2 seconds
rollsum3 0.9 seconds
c 0.7 seconds
*/

async function stress(fn, fun, runs = 100000) {
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

stress('./small.pdf', rollSum3).catch(err => console.error(err))

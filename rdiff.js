const { signature, delta, patch } = require('rdiff')
const { readFile, writeFile } = require('fs')
const { duplicate } = require('./pdf')
const { promisify } = require('util')

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const signatureAsync = promisify(signature)
const deltaAsync = promisify(delta)
const patchAsync = promisify(patch)

async function run(fname) {
	const original = await readFileAsync(`./${fname}.pdf`)
	const dupe = await duplicate(original, 1000)
	await writeFileAsync('./out/dupe.pdf', dupe)
	await signatureAsync(`./${fname}.pdf`, './out/original.sig')
	await deltaAsync('./out/original.sig', './out/dupe.pdf', './out/dupe.delta')
	await patchAsync(`./${fname}.pdf`, './out/dupe.delta', './out/patched.pdf')
}

run('small').catch(err => console.error(err))

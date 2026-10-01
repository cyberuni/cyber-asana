// Plugin manifests carry their own `version`, which nothing bumps: they were written
// once at 0.4.1 and were still 0.4.1 when the package reached 0.5.0. Changesets only
// touches package.json files, so this runs from the `version` script to keep the
// manifests in step with the published package.
//
// Rewrites the version line textually rather than reserialising the JSON, so biome's
// formatting (tabs, inlined short arrays) survives untouched.
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'packages/cyber-asana/package.json'
// The plugin root is the npm package itself, so every manifest lives beside the
// package.json that carries the version.
const MANIFESTS = [
	'.claude-plugin/plugin.json',
	'.cursor-plugin/plugin.json',
	'.codex-plugin/plugin.json',
	'plugin.json',
].map((file) => `packages/cyber-asana/${file}`)

const { version } = JSON.parse(readFileSync(SOURCE, 'utf8'))
if (!version) throw new Error(`no version field in ${SOURCE}`)

for (const file of MANIFESTS) {
	const before = readFileSync(file, 'utf8')
	const after = before.replace(/("version":\s*)"[^"]*"/, `$1"${version}"`)
	if (after === before) {
		console.info(`${file} already at ${version}`)
		continue
	}
	writeFileSync(file, after)
	console.info(`${file} -> ${version}`)
}

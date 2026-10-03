// Fails when a file `pnpm plugin:build` derives from the canonical plugin.json differs from what
// the build writes now — a hand-edit, or a manifest/skill/command change committed without
// rebuilding. Compares before and after the build rather than diffing against git, so it holds
// on a dirty working tree too.
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const DERIVED = [
	'packages/cyber-asana/.claude-plugin',
	'packages/cyber-asana/.cursor-plugin',
	'packages/cyber-asana/.codex-plugin',
	'packages/cyber-asana/com.github.copilot',
	'.claude-plugin/marketplace.json',
]

function snapshot() {
	const files = new Map()
	const walk = (entry) => {
		if (!existsSync(entry)) return
		if (statSync(entry).isDirectory()) {
			for (const child of readdirSync(entry)) walk(path.join(entry, child))
		} else {
			files.set(entry, readFileSync(entry, 'utf8'))
		}
	}
	for (const entry of DERIVED) walk(entry)
	return files
}

const before = snapshot()
// The Codex build also writes each skill to ~/.codex/prompts/. A check has no business installing
// prompts into the contributor's home, so it builds against a throwaway one.
const home = mkdtempSync(path.join(tmpdir(), 'plugin-check-'))
try {
	execSync('pnpm plugin:build', { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, HOME: home } })
} finally {
	rmSync(home, { recursive: true, force: true })
}
const after = snapshot()

const drifted = [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file))
if (drifted.length > 0) {
	console.error(
		`derived plugin files were out of date (now rebuilt; commit them):\n${drifted.map((f) => `  ${f}`).join('\n')}`,
	)
	process.exit(1)
}
console.info(`plugin build is current (${after.size} derived files)`)

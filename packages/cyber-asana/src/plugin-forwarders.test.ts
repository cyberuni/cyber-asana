import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Each skill that runs the CLI calls it through a forwarder that `universal-plugin plugin build` writes
 * into the skill's `scripts/` folder. The forwarder runs this checkout's build in development and
 * `npx -y cyber-asana@<plugin version>` in an install, so a skill writes one line that works on every
 * install route and never a bare `cyber-asana`, `npx` or `pnpm exec` call.
 */

const packageRoot = path.resolve(import.meta.dirname, '..')
const skillsDir = path.join(packageRoot, 'skills')
const forwarderLine = "node <this skill's folder>/scripts/cyber-asana.mjs"

function markdownFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name)
		if (statSync(file).isDirectory()) return markdownFiles(file)
		return file.endsWith('.md') && name !== 'README.md' ? [file] : []
	})
}

const skills = readdirSync(skillsDir).filter((name) => statSync(path.join(skillsDir, name)).isDirectory())
const declared = Object.keys(
	(
		JSON.parse(readFileSync(path.join(packageRoot, 'plugin.json'), 'utf8')) as {
			extensions: { 'org.cyberuni.universal-plugin': { scripts?: Record<string, unknown> } }
		}
	).extensions['org.cyberuni.universal-plugin'].scripts ?? {},
)

describe('the skill forwarders', () => {
	it.each(skills)('%s declares and ships a cyber-asana forwarder when it runs the CLI', (skill) => {
		const text = markdownFiles(path.join(skillsDir, skill))
			.map((f) => readFileSync(f, 'utf8'))
			.join('\n')
		if (!text.includes(forwarderLine)) return
		const entry = `skills/${skill}/scripts/cyber-asana.mjs`
		expect(declared).toContain(entry)
		expect(existsSync(path.join(packageRoot, entry))).toBe(true)
	})

	it.runIf(existsSync(path.join(packageRoot, 'dist/cli.js')))(
		'runs the CLI of this checkout from a skill folder',
		() => {
			const { version } = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
				version: string
			}
			const run = spawnSync(process.execPath, [path.join(skillsDir, 'asana/scripts/cyber-asana.mjs'), '--version'], {
				encoding: 'utf8',
			})
			expect(run.status).toBe(0)
			expect(run.stdout.trim()).toBe(version)
		},
	)
})

describe('the plugin skills', () => {
	it.each(markdownFiles(skillsDir).map((f) => path.relative(packageRoot, f)))(
		'%s runs the CLI only through its forwarder',
		(file) => {
			const text = readFileSync(path.join(packageRoot, file), 'utf8')
			// npx/pnpm exec on the own package, except the MCP server entry written into a client's config.
			expect(text).not.toMatch(/(npx\s+(-y\s+|--yes\s+)?|pnpm exec\s+)cyber-asana\S*\s+(?!mcp\b)/)
			// A bare `cyber-asana <subcommand>` inside inline code or a fenced block.
			expect(text).not.toMatch(/(^|`)cyber-asana (--?[a-z]|[a-z<])/m)
		},
	)
})

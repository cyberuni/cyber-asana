import { spawnSync } from 'node:child_process'
import { accessSync, constants, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The plugin ships a `cyber-asana` launcher in `bin/`, which Claude Code puts on PATH while the plugin is
 * enabled. It runs the plugin's own `dist/cli.js`, so the CLI always matches the plugin's version and a
 * permission rule written for `cyber-asana ...` matches. Skills call it and never fall back to `npx`.
 */

const packageRoot = path.resolve(import.meta.dirname, '..')
const launcher = path.join(packageRoot, 'bin/cyber-asana')

function markdownFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name)
		if (statSync(file).isDirectory()) return markdownFiles(file)
		return file.endsWith('.md') ? [file] : []
	})
}

describe('the plugin launcher', () => {
	it('exists and is executable', () => {
		expect(existsSync(launcher)).toBe(true)
		expect(() => accessSync(launcher, constants.X_OK)).not.toThrow()
	})

	it('runs under node and imports the plugin own dist/cli.js, not a registry copy', () => {
		const source = readFileSync(launcher, 'utf8')
		expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
		expect(source).toContain('../dist/cli.js')
		expect(source).not.toMatch(/npx|npm exec/)
	})

	it('is published with the package', () => {
		const { files } = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { files: string[] }
		expect(files).toContain('bin')
	})

	it.runIf(existsSync(path.join(packageRoot, 'dist/cli.js')))(
		'prints the CLI version of the plugin it ships in',
		() => {
			const { version } = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
				version: string
			}
			const run = spawnSync(process.execPath, [launcher, '--version'], { encoding: 'utf8' })
			expect(run.status).toBe(0)
			expect(run.stdout.trim()).toBe(version)
		},
	)
})

describe('the plugin skills', () => {
	it.each(markdownFiles(path.join(packageRoot, 'skills')).map((f) => path.relative(packageRoot, f)))(
		'%s never runs a CLI command through npx',
		(file) => {
			expect(readFileSync(path.join(packageRoot, file), 'utf8')).not.toMatch(
				/npx\s+(-y\s+|--yes\s+)?cyber-asana\S*\s+(?!mcp\b)/,
			)
		},
	)
})

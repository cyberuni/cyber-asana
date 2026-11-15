import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { htmlCommand } from './cli.js'

describe('asana-html/cli', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	const originalArgv = [...process.argv]
	let root: string | undefined

	afterEach(async () => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
		if (root) await rm(root, { recursive: true, force: true })
		root = undefined
	})

	async function file(content: string) {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-html-'))
		const path = join(root, 'body.html')
		await writeFile(path, content)
		return path
	}

	async function run(args: string[], argv: string[] = []) {
		process.argv = ['node', 'test', ...argv]
		const html = htmlCommand()
		for (const command of [html, ...html.commands]) command.exitOverride().configureOutput({ writeErr: () => {} })
		const program = new Command().addCommand(html)
		await program.parseAsync(['node', 'test', 'html', ...args], { from: 'node' })
	}

	const printed = () => logSpy.mock.calls.map((c) => String(c[0])).join('\n')

	it('check reads a file and prints the problems as JSON', async () => {
		const path = await file('<h2>x</h2>')
		await run(['check', path, '--surface', 'status-update'], ['--json'])
		const out = JSON.parse(printed())
		expect(out.ok).toBe(false)
		expect(out.problems).toContain(
			'<h2> is not supported in a status update (Asana escapes the whole body); use <strong> for a heading',
		)
	})

	it('check names a clean body in text mode', async () => {
		const path = await file('<body>x</body>')
		await run(['check', path, '--surface', 'task-notes'])
		expect(printed()).toContain('No problems found for task-notes')
	})

	it('fix prints only the fixed html in text mode, so it can be piped', async () => {
		const path = await file('<h2>Health</h2>\n<b>x</b>')
		await run(['fix', path, '--surface', 'status-update'])
		expect(printed()).toBe('<body><strong>Health</strong>\n<strong>x</strong></body>')
		expect(errorSpy).not.toHaveBeenCalled()
	})

	it('fix names what it could not repair on stderr', async () => {
		const path = await file('<img src="https://e.com/a.png">')
		await run(['fix', path, '--surface', 'task-notes'])
		expect(errorSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('<img>')
	})

	it('rules lists every surface when none is named', async () => {
		await run(['rules'], ['--json'])
		expect(JSON.parse(printed()).map((r: { surface: string }) => r.surface)).toEqual([
			'task-notes',
			'comment',
			'project-brief',
			'status-update',
		])
	})

	it('refuses a surface it does not know', async () => {
		await expect(run(['rules', '--surface', 'wiki'])).rejects.toThrow(/Unknown surface "wiki"/)
	})
})

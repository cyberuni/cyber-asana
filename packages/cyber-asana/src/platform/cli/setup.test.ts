import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOOK_COMMAND, hasCyberAsanaHook, setupCommand, withSessionStartHook } from './setup.js'

async function tempSettingsPath(contents?: unknown) {
	const dir = await mkdtemp(join(tmpdir(), 'cyber-asana-setup-'))
	const path = join(dir, 'settings.json')
	if (contents !== undefined) await writeFile(path, JSON.stringify(contents, null, 2), 'utf-8')
	return path
}

async function runHook(args: string[]) {
	const program = new Command().addCommand(setupCommand())
	await program.parseAsync(['node', 'test', 'setup', 'hook', ...args], { from: 'node' })
}

describe('withSessionStartHook', () => {
	it('adds a SessionStart hook to empty settings', () => {
		expect(withSessionStartHook({})).toEqual({
			hooks: { SessionStart: [{ hooks: [{ type: 'command', command: HOOK_COMMAND }] }] },
		})
	})

	it('is a no-op when the hook is already there', () => {
		const installed = withSessionStartHook({})
		expect(withSessionStartHook(installed)).toBe(installed)
	})

	it('preserves unrelated settings and other hook events', () => {
		const next = withSessionStartHook({
			model: 'opus',
			hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }] },
		})
		expect(next.model).toBe('opus')
		expect(next.hooks?.PreToolUse).toHaveLength(1)
		expect(next.hooks?.SessionStart).toHaveLength(1)
	})

	it('keeps an existing SessionStart hook from another tool', () => {
		const next = withSessionStartHook({
			hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'other-tool' }] }] },
		})
		expect(next.hooks?.SessionStart).toHaveLength(2)
	})
})

describe('hasCyberAsanaHook', () => {
	it('is false for settings with no hooks at all', () => {
		expect(hasCyberAsanaHook({})).toBe(false)
		expect(hasCyberAsanaHook({ hooks: {} })).toBe(false)
	})
})

describe('setup hook', () => {
	afterEach(() => vi.restoreAllMocks())

	it('writes the hook into a settings file that does not exist yet', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const path = await tempSettingsPath()

		await runHook(['--settings', path])

		const written = JSON.parse(await readFile(path, 'utf-8'))
		expect(hasCyberAsanaHook(written)).toBe(true)
	})

	it('is idempotent — a second run leaves the file unchanged', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const path = await tempSettingsPath()

		await runHook(['--settings', path])
		const first = await readFile(path, 'utf-8')
		await runHook(['--settings', path])

		expect(await readFile(path, 'utf-8')).toBe(first)
	})

	it('reports already-installed on the second run', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const path = await tempSettingsPath()
		await runHook(['--settings', path])
		logSpy.mockClear()

		await runHook(['--settings', path])

		expect(logSpy.mock.calls.map((c) => String(c[0])).some((l) => l.includes('already installed'))).toBe(true)
	})

	it('writes nothing with --dry-run', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const path = await tempSettingsPath({ model: 'opus' })

		await runHook(['--settings', path, '--dry-run'])

		expect(hasCyberAsanaHook(JSON.parse(await readFile(path, 'utf-8')))).toBe(false)
	})

	it('does not clobber settings it did not write', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const path = await tempSettingsPath({ model: 'opus', permissions: { allow: ['Bash(ls:*)'] } })

		await runHook(['--settings', path])

		const written = JSON.parse(await readFile(path, 'utf-8'))
		expect(written.model).toBe('opus')
		expect(written.permissions).toEqual({ allow: ['Bash(ls:*)'] })
	})
})

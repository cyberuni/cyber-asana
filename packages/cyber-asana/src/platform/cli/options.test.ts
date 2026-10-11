import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addGidOption, addPaginationOptions, normalizedGid, printNextPageHint } from './options.js'

describe('addPaginationOptions', () => {
	it('offers --opt-fields by default', () => {
		const cmd = addPaginationOptions(new Command('list'))

		expect(cmd.options.map((o) => o.long)).toContain('--opt-fields')
	})

	it('omits --opt-fields for endpoints with a fixed response shape', () => {
		const cmd = addPaginationOptions(new Command('list'), { optFields: false })

		expect(cmd.options.map((o) => o.long)).toEqual(['--limit', '--offset', '--all', '--max-pages'])
	})
})

describe('printNextPageHint', () => {
	afterEach(() => vi.restoreAllMocks())

	const page = { data: [{ gid: '1' }], next_page: { offset: 'cursor-abc' } }

	it('prints the offset in text mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextPageHint(page, ['node', 'cli'])
		expect(spy).toHaveBeenCalledWith('\nNext offset: cursor-abc')
	})

	it('stays silent in json mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextPageHint(page, ['node', 'cli', '--json'])
		expect(spy).not.toHaveBeenCalled()
	})

	it('stays silent in toon mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextPageHint(page, ['node', 'cli', '--toon'])
		expect(spy).not.toHaveBeenCalled()
	})

	it('stays silent when there is no next page', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextPageHint({ data: [], next_page: null }, ['node', 'cli'])
		expect(spy).not.toHaveBeenCalled()
	})
})

describe('workspace GID option', () => {
	const original = { gid: process.env.ASANA_WORKSPACE_GID, legacy: process.env.ASANA_WORKSPACE }

	afterEach(() => {
		if (original.gid === undefined) delete process.env.ASANA_WORKSPACE_GID
		else process.env.ASANA_WORKSPACE_GID = original.gid
		if (original.legacy === undefined) delete process.env.ASANA_WORKSPACE
		else process.env.ASANA_WORKSPACE = original.legacy
	})

	function parse(args: string[]) {
		const cmd = addGidOption(new Command('list').exitOverride(), 'workspace', 'Workspace GID')
		cmd.parse(args, { from: 'user' })
		return normalizedGid(cmd.opts(), 'workspace')
	}

	it('names ASANA_WORKSPACE_GID in the help', () => {
		const cmd = addGidOption(new Command('list'), 'workspace', 'Workspace GID')
		expect(cmd.helpInformation()).toContain('ASANA_WORKSPACE_GID')
	})

	it('falls back to ASANA_WORKSPACE_GID', () => {
		process.env.ASANA_WORKSPACE_GID = 'ws-env'
		expect(parse([])).toBe('ws-env')
	})

	it('prefers the flag over ASANA_WORKSPACE_GID', () => {
		process.env.ASANA_WORKSPACE_GID = 'ws-env'
		expect(parse(['--workspace-gid', 'ws-flag'])).toBe('ws-flag')
	})

	it('treats an unexpanded ASANA_WORKSPACE_GID placeholder as absent', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		process.env.ASANA_WORKSPACE_GID = '${ASANA_WORKSPACE_GID}'
		expect(parse([])).toBeUndefined()
	})

	it('ignores the removed ASANA_WORKSPACE alias', () => {
		delete process.env.ASANA_WORKSPACE_GID
		process.env.ASANA_WORKSPACE = 'ws-legacy'
		expect(parse([])).toBeUndefined()
	})
})

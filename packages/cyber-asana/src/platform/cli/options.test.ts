import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addPaginationOptions, printNextPageHint } from './options.js'

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

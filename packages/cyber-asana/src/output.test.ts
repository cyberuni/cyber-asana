import { afterEach, describe, expect, it, vi } from 'vitest'
import { output, printEmpty, printTable, selectFormat } from './output.js'
import { encodeToon } from './toon.js'

describe('selectFormat', () => {
	it('returns text by default', () => {
		expect(selectFormat(['node', 'cli', 'task', 'list'])).toBe('text')
	})

	it('returns json when --json is present', () => {
		expect(selectFormat(['node', 'cli', '--json'])).toBe('json')
	})

	it('returns toon when --toon is present', () => {
		expect(selectFormat(['node', 'cli', '--toon'])).toBe('toon')
	})

	it('prefers toon when both --toon and --json are present', () => {
		expect(selectFormat(['node', 'cli', '--json', '--toon'])).toBe('toon')
	})
})

describe('output', () => {
	afterEach(() => vi.restoreAllMocks())

	it('prints TOON when the toon format is selected', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		output({ a: 1 }, () => {}, ['node', 'cli', '--toon'])
		expect(spy).toHaveBeenCalledWith(encodeToon({ a: 1 }))
	})

	it('prints pretty JSON when the json format is selected', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		output({ a: 1 }, () => {}, ['node', 'cli', '--json'])
		expect(spy).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2))
	})

	it('invokes the readable renderer when the text format is selected', () => {
		const readable = vi.fn()
		output({ a: 1 }, readable, ['node', 'cli'])
		expect(readable).toHaveBeenCalledOnce()
	})
})

describe('printTable', () => {
	afterEach(() => vi.restoreAllMocks())

	it('prints a definitive empty state when there are no rows', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printTable([], [{ label: 'Name', get: () => '' }])
		expect(spy).toHaveBeenCalledWith('0 results')
	})
})

describe('printEmpty', () => {
	afterEach(() => vi.restoreAllMocks())

	it('prints a definitive zero-results line', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printEmpty()
		expect(spy).toHaveBeenCalledWith('0 results')
	})

	it('includes the entity name when provided', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printEmpty('tasks')
		expect(spy).toHaveBeenCalledWith('0 tasks found')
	})
})

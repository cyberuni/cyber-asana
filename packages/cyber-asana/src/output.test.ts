import { afterEach, describe, expect, it, vi } from 'vitest'
import { output, printEmpty, printNextSteps, printSummary, printTable, selectFormat } from './output.js'
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

describe('printNextSteps', () => {
	afterEach(() => vi.restoreAllMocks())

	it('prints suggestions in text mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextSteps(['cyber-asana task get <gid>'], ['node', 'cli'])
		expect(spy).toHaveBeenCalledWith('\nNext steps:')
		expect(spy).toHaveBeenCalledWith('  - cyber-asana task get <gid>')
	})

	it('stays silent in structured modes to keep output parseable', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextSteps(['do a thing'], ['node', 'cli', '--toon'])
		printNextSteps(['do a thing'], ['node', 'cli', '--json'])
		expect(spy).not.toHaveBeenCalled()
	})

	it('prints nothing when there are no suggestions', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printNextSteps([], ['node', 'cli'])
		expect(spy).not.toHaveBeenCalled()
	})
})

describe('printSummary', () => {
	afterEach(() => vi.restoreAllMocks())

	it('prints the aggregate line in text mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printSummary('3 tasks: 2 incomplete, 1 done', ['node', 'cli'])
		expect(spy).toHaveBeenCalledWith('3 tasks: 2 incomplete, 1 done')
	})

	it('stays silent in structured modes', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		printSummary('3 tasks', ['node', 'cli', '--json'])
		expect(spy).not.toHaveBeenCalled()
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

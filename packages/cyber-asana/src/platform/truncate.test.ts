import { describe, expect, it } from 'vitest'
import { isFull, truncate } from './truncate.js'

describe('truncate', () => {
	it('returns short text unchanged', () => {
		expect(truncate('hello', { limit: 10 })).toBe('hello')
	})

	it('truncates long text and appends a size hint with the total length', () => {
		expect(truncate('a'.repeat(20), { limit: 5 })).toBe('aaaaa… [truncated, 20 chars total; use --full for the rest]')
	})

	it('returns the full text when full is true', () => {
		const long = 'a'.repeat(20)
		expect(truncate(long, { limit: 5, full: true })).toBe(long)
	})

	it('returns an empty string for null or undefined', () => {
		expect(truncate(undefined, { limit: 5 })).toBe('')
		expect(truncate(null, { limit: 5 })).toBe('')
	})
})

describe('isFull', () => {
	it('is false by default', () => {
		expect(isFull(['node', 'cli', 'task', 'get'])).toBe(false)
	})

	it('is true when --full is present', () => {
		expect(isFull(['node', 'cli', 'task', 'get', '--full'])).toBe(true)
	})
})

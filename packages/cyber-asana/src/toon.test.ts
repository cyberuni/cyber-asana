import { describe, expect, it } from 'vitest'
import { encodeToon } from './toon.js'

describe('encodeToon', () => {
	it('encodes a flat object as key: value lines', () => {
		expect(encodeToon({ name: 'Build feature', gid: '123' })).toBe('name: Build feature\ngid: 123')
	})

	it('encodes scalars without quoting', () => {
		expect(encodeToon({ done: true, count: 3, missing: null })).toBe('done: true\ncount: 3\nmissing: null')
	})

	it('quotes strings that contain the field separator', () => {
		expect(encodeToon({ note: 'a, b' })).toBe('note: "a, b"')
	})

	it('quotes strings that contain a colon', () => {
		expect(encodeToon({ url: 'https://x' })).toBe('url: "https://x"')
	})

	it('quotes numeric-looking strings so they round-trip as strings', () => {
		expect(encodeToon({ gid: '00123' })).toBe('gid: "00123"')
	})

	it('quotes empty strings', () => {
		expect(encodeToon({ note: '' })).toBe('note: ""')
	})

	it('encodes a nested object with indentation', () => {
		expect(encodeToon({ assignee: { name: 'Ada', gid: '7' } })).toBe('assignee:\n  name: Ada\n  gid: 7')
	})

	it('encodes an array of primitives inline with a length marker', () => {
		expect(encodeToon({ tags: ['a', 'b', 'c'] })).toBe('tags[3]: a,b,c')
	})

	it('encodes an empty array with a zero length marker', () => {
		expect(encodeToon({ tags: [] })).toBe('tags[0]:')
	})

	it('encodes a uniform array of objects as a tabular block', () => {
		const value = {
			tasks: [
				{ gid: '1', name: 'A', done: false },
				{ gid: '2', name: 'B', done: true },
			],
		}
		expect(encodeToon(value)).toBe('tasks[2]{gid,name,done}:\n  1,A,false\n  2,B,true')
	})

	it('encodes a top-level uniform array as a tabular block', () => {
		const value = [
			{ gid: '1', name: 'A' },
			{ gid: '2', name: 'B' },
		]
		expect(encodeToon(value)).toBe('[2]{gid,name}:\n  1,A\n  2,B')
	})

	it('falls back to a list block for non-uniform object arrays', () => {
		const value = { items: [{ a: 1 }, { b: 2 }] }
		expect(encodeToon(value)).toBe('items[2]:\n  - a: 1\n  - b: 2')
	})

	it('encodes a top-level scalar', () => {
		expect(encodeToon('hello')).toBe('hello')
	})
})

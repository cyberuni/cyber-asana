import { describe, expect, it } from 'vitest'
import { exitCodeFor, renderCliError } from './cli-error.js'

function asanaError(status: number, message = 'boom') {
	return { response: { status, body: { errors: [{ message }] } } }
}

describe('exitCodeFor', () => {
	it('maps generic errors to 1', () => {
		expect(exitCodeFor(new Error('nope'))).toBe(1)
	})

	it('maps missing-token config errors to 3', () => {
		expect(exitCodeFor(new Error('ASANA_TOKEN is required'))).toBe(3)
	})

	it('maps 401 to 3 (auth)', () => {
		expect(exitCodeFor(asanaError(401))).toBe(3)
	})

	it('maps 403 to 4 (forbidden)', () => {
		expect(exitCodeFor(asanaError(403))).toBe(4)
	})

	it('maps 404 to 5 (not found)', () => {
		expect(exitCodeFor(asanaError(404))).toBe(5)
	})

	it('maps 429 to 6 (rate limited)', () => {
		expect(exitCodeFor(asanaError(429))).toBe(6)
	})
})

describe('renderCliError', () => {
	it('renders Asana API errors as a single human line in text mode', () => {
		expect(renderCliError(asanaError(404, 'Not Found'), 'text')).toBe('Asana API error: Not Found')
	})

	it('renders generic errors with an Error prefix in text mode', () => {
		expect(renderCliError(new Error('nope'), 'text')).toBe('Error: nope')
	})

	it('includes a hint line when present in text mode', () => {
		const text = renderCliError(new Error('ASANA_TOKEN missing'), 'text')
		expect(text).toContain('Error: ASANA_TOKEN missing')
		expect(text).toContain('Hint:')
	})

	it('renders structured JSON when the json format is selected', () => {
		const parsed = JSON.parse(renderCliError(asanaError(404, 'Not Found'), 'json'))
		expect(parsed.ok).toBe(false)
		expect(parsed.error.kind).toBe('asana_api')
		expect(parsed.error.status).toBe(404)
	})

	it('renders structured TOON when the toon format is selected', () => {
		const toon = renderCliError(new Error('nope'), 'toon')
		expect(toon).toContain('ok: false')
		expect(toon).toContain('message: nope')
	})
})

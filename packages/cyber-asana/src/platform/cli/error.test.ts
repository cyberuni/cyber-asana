import { describe, expect, it } from 'vitest'
import { CodedConfigError } from '../coded-error.js'
import { ReferenceAmbiguousError } from '../reference-metadata.js'
import { exitCodeFor, renderCliError } from './error.js'

function asanaError(status: number, message = 'boom') {
	return { response: { status, body: { errors: [{ message }] } } }
}

describe('exitCodeFor', () => {
	it('maps an ambiguous reference to 8, apart from other config errors', () => {
		expect(exitCodeFor(new ReferenceAmbiguousError('cyber-asana.scrum', ['a/cyber-asana.scrum']))).toBe(8)
	})

	it('maps scope-missing and scope-unknown to 2, as a fixable command line, apart from each other by code', () => {
		expect(exitCodeFor(new CodedConfigError('scope-missing', 'No scope'))).toBe(2)
		expect(exitCodeFor(new CodedConfigError('scope-unknown', 'No such scope', { options: ['web'] }))).toBe(2)
	})

	it.each(['sprint-none', 'sprint-unknown', 'model-unsupported', 'policy-incomplete'])(
		'maps %s to 2: the caller can start a sprint or fix the configuration and retry',
		(code) => {
			expect(exitCodeFor(new CodedConfigError(code, 'x'))).toBe(2)
		},
	)

	it('maps a coded config error with no pinned exit code to 3, like other config errors', () => {
		expect(exitCodeFor(new CodedConfigError('something-else', 'x'))).toBe(3)
	})

	it('maps generic errors to 1', () => {
		expect(exitCodeFor(new Error('nope'))).toBe(1)
	})

	it('maps missing-token config errors to 3', () => {
		expect(exitCodeFor(new Error('ASANA_ACCESS_TOKEN is required'))).toBe(3)
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

	it('maps 402 to 7 (above the workspace plan level)', () => {
		expect(exitCodeFor(asanaError(402))).toBe(7)
	})
})

describe('renderCliError', () => {
	const ambiguous = new ReferenceAmbiguousError('cyber-asana.scrum', ['a/cyber-asana.scrum', 'b/cyber-asana.scrum'])

	it('lists the options of an ambiguous reference in text mode', () => {
		const text = renderCliError(ambiguous, 'text')
		expect(text).toContain('Error: cyber-asana.scrum is ambiguous')
		expect(text).toContain('Options: a/cyber-asana.scrum, b/cyber-asana.scrum')
		expect(text).toContain('reference customize cyber-asana.scrum --extends')
	})

	it('renders an ambiguous reference as a structured body under --json', () => {
		expect(JSON.parse(renderCliError(ambiguous, 'json'))).toMatchObject({
			ok: false,
			error: { kind: 'config', code: 'reference-ambiguous', options: ['a/cyber-asana.scrum', 'b/cyber-asana.scrum'] },
		})
	})

	it('renders a coded config error with its code, options, and hint under --json', () => {
		const error = new CodedConfigError('scope-unknown', 'Scope "x" is not configured', {
			options: ['web', 'platform'],
			hint: 'Pick one of the options.',
		})
		expect(JSON.parse(renderCliError(error, 'json'))).toEqual({
			ok: false,
			error: {
				kind: 'config',
				code: 'scope-unknown',
				message: 'Scope "x" is not configured',
				options: ['web', 'platform'],
				hint: 'Pick one of the options.',
			},
		})
		expect(renderCliError(error, 'text')).toBe(
			'Error: Scope "x" is not configured\nOptions: web, platform\nHint: Pick one of the options.',
		)
	})

	it('renders Asana API errors as a single human line in text mode', () => {
		expect(renderCliError(asanaError(404, 'Not Found'), 'text')).toBe('Asana API error: Not Found')
	})

	it('renders generic errors with an Error prefix in text mode', () => {
		expect(renderCliError(new Error('nope'), 'text')).toBe('Error: nope')
	})

	it('includes a hint line when present in text mode', () => {
		const text = renderCliError(new Error('ASANA_ACCESS_TOKEN missing'), 'text')
		expect(text).toContain('Error: ASANA_ACCESS_TOKEN missing')
		expect(text).toContain('Hint:')
	})

	it('names the plan limitation in the hint for a 402', () => {
		const text = renderCliError(asanaError(402, 'Payment Required'), 'text')
		expect(text).toContain('Asana API error: Payment Required')
		expect(text).toContain("Hint: Asana answered 402 — this operation is above the workspace's plan level")
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

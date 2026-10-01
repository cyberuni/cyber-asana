import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { envValue } from './env.js'

describe('envValue', () => {
	const original = process.env.ASANA_TOKEN
	const originalAlias = process.env.ASANA_ACCESS_TOKEN

	beforeEach(() => {
		delete process.env.ASANA_TOKEN
		delete process.env.ASANA_ACCESS_TOKEN
	})

	afterEach(() => {
		if (original !== undefined) process.env.ASANA_TOKEN = original
		else delete process.env.ASANA_TOKEN
		if (originalAlias !== undefined) process.env.ASANA_ACCESS_TOKEN = originalAlias
		else delete process.env.ASANA_ACCESS_TOKEN
	})

	it('reads the preferred alias', () => {
		process.env.ASANA_ACCESS_TOKEN = 'real-token'
		expect(envValue('ASANA_TOKEN')).toBe('real-token')
	})

	// An agent host that cannot expand a ${VAR} reference forwards the reference
	// text verbatim, so the server receives the placeholder as its value.
	it('treats an unexpanded placeholder as absent', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		process.env.ASANA_ACCESS_TOKEN = '${ASANA_ACCESS_TOKEN}'
		expect(envValue('ASANA_TOKEN')).toBeUndefined()
	})

	it('treats an unexpanded placeholder carrying a default as absent', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		process.env.ASANA_ACCESS_TOKEN = '${ASANA_ACCESS_TOKEN:-}'
		expect(envValue('ASANA_TOKEN')).toBeUndefined()
	})

	// Cursor spells its environment reference `${env:NAME}`.
	it('treats an unexpanded env-prefixed placeholder as absent', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		process.env.ASANA_ACCESS_TOKEN = '${env:ASANA_ACCESS_TOKEN}'
		expect(envValue('ASANA_TOKEN')).toBeUndefined()
	})

	it('falls through to the deprecated alias when the preferred one is a placeholder', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		process.env.ASANA_ACCESS_TOKEN = '${ASANA_ACCESS_TOKEN}'
		process.env.ASANA_TOKEN = 'real-token'
		expect(envValue('ASANA_TOKEN')).toBe('real-token')
	})

	it('keeps a value that merely contains placeholder-like text', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		const embedded = 'prefix-${NOT_A_PLACEHOLDER}-suffix'
		process.env.ASANA_ACCESS_TOKEN = embedded
		expect(envValue('ASANA_TOKEN')).toBe(embedded)
	})
})

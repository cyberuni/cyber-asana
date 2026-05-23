import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createClient } from './client.js'

describe('createClient', () => {
	const original = process.env.ASANA_TOKEN

	beforeEach(() => {
		delete process.env.ASANA_TOKEN
	})

	afterEach(() => {
		if (original !== undefined) process.env.ASANA_TOKEN = original
		else delete process.env.ASANA_TOKEN
	})

	it('throws with setup instructions when ASANA_TOKEN is not set', () => {
		expect(() => createClient()).toThrowError(/ASANA_TOKEN environment variable is not set/)
		expect(() => createClient()).toThrowError(/app\.asana\.com\/0\/my-apps/)
		expect(() => createClient()).toThrowError(/export ASANA_TOKEN/)
	})

	it('returns a configured client when ASANA_TOKEN is set', () => {
		process.env.ASANA_TOKEN = 'test-token'
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('test-token')
	})
})

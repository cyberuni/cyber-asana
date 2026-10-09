import Asana from 'asana'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, getTokenOverride, setAmbientToken, setTokenOverride } from './client.js'

describe('createClient', () => {
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
		// reset override between tests
		setTokenOverride(undefined)
		setAmbientToken(undefined)
	})

	it('throws with setup instructions when ASANA_TOKEN is not set', () => {
		expect(() => createClient()).toThrowError(/ASANA_TOKEN environment variable is not set/)
		expect(() => createClient()).toThrowError(/app\.asana\.com\/0\/my-apps/)
		expect(() => createClient()).toThrowError(/--token/)
	})

	it('returns a configured client when ASANA_TOKEN is set', () => {
		process.env.ASANA_TOKEN = 'env-token'
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('env-token')
	})

	it('falls back to ASANA_ACCESS_TOKEN when ASANA_TOKEN is not set', () => {
		process.env.ASANA_ACCESS_TOKEN = 'alias-token'
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('alias-token')
	})

	it('prefers ASANA_ACCESS_TOKEN over deprecated ASANA_TOKEN when both are set', () => {
		process.env.ASANA_TOKEN = 'deprecated-token'
		process.env.ASANA_ACCESS_TOKEN = 'preferred-token'
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('preferred-token')
	})

	it('reports no token override until one is set', () => {
		expect(getTokenOverride()).toBeUndefined()
	})

	it('reports the token override that was set', () => {
		setTokenOverride('override-token')
		expect(getTokenOverride()).toBe('override-token')
	})

	it('uses an ambient token when no flag or environment variable is set', () => {
		setAmbientToken('ambient-token')
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('ambient-token')
	})

	it('prefers an environment variable over an ambient token', () => {
		process.env.ASANA_ACCESS_TOKEN = 'env-token'
		setAmbientToken('ambient-token')
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('env-token')
	})

	it('prefers the --token flag over an ambient token', () => {
		setAmbientToken('ambient-token')
		setTokenOverride('flag-token')
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('flag-token')
	})

	it('prefers setTokenOverride over ASANA_TOKEN env var', () => {
		process.env.ASANA_TOKEN = 'env-token'
		process.env.ASANA_ACCESS_TOKEN = 'alias-token'
		setTokenOverride('override-token')
		const client = createClient()
		expect(client.authentications['token'].accessToken).toBe('override-token')
	})

	it('puts every request behind the rate limiter, retrying a 429', async () => {
		process.env.ASANA_TOKEN = 'limited-token'
		const sdkCall = vi
			.spyOn(Asana.ApiClient.prototype, 'callApi')
			.mockRejectedValueOnce({ status: 429, response: { header: { 'retry-after': '0' } } })
			.mockResolvedValue({ data: 'ok', response: {} })

		try {
			const client = createClient()

			await expect(client.callApi('/tasks', 'GET', {}, {}, {}, {}, null, [], [], [], null)).resolves.toMatchObject({
				data: 'ok',
			})
			expect(sdkCall).toHaveBeenCalledTimes(2)
		} finally {
			sdkCall.mockRestore()
		}
	})
})

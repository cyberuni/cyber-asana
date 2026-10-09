import { describe, expect, it, vi } from 'vitest'
import { rateLimitClient } from './rate-limit-client.js'

const noEnv = () => undefined

describe('rateLimitClient', () => {
	it('routes the client callApi through the limiter, retrying a 429', async () => {
		let attempts = 0
		const client = {
			tag: 'client',
			callApi: vi.fn(async function (this: { tag: string }, _path: string) {
				if (++attempts === 1) throw { status: 429, response: { header: { 'retry-after': '0' } } }
				return `ok from ${this.tag}`
			}),
		}
		const original = client.callApi

		const limited = rateLimitClient(client, { token: 'retry-token', read: noEnv })

		expect(limited).toBe(client)
		await expect(limited.callApi('/tasks')).resolves.toBe('ok from client')
		expect(original).toHaveBeenCalledTimes(2)
	})

	it('reports a wait of a second or more through onWait', async () => {
		const waits: number[] = []
		let attempts = 0
		const client = {
			callApi: async (_path: string) => {
				if (++attempts === 1) throw { status: 429, response: { header: { 'retry-after': '1' } } }
				return 'ok'
			},
		}
		const limited = rateLimitClient(client, {
			token: 'wait-token',
			read: noEnv,
			onWait: (ms) => waits.push(ms),
			sleep: async () => {},
		})

		await limited.callApi('/tasks')

		expect(waits).toEqual([1_000])
	})
})

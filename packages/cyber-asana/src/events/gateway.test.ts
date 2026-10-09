import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaEventGateway } from './gateway.js'

describe('createAsanaEventGateway', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('reads the sync token and has_more from the Collection the SDK resolves to', async () => {
		// Live Asana: the SDK resolves to a Collection whose `data` holds the events and whose
		// `_response` holds the whole body — the sync token is not on the Collection itself.
		const events = [{ action: 'changed' }]
		vi.spyOn(Asana.EventsApi.prototype, 'getEvents').mockResolvedValue({
			data: events,
			_response: { data: events, sync: 'next-token', has_more: true, next_page: null },
			nextPage: async () => ({ data: null }),
		})

		const feed = await createAsanaEventGateway({} as Asana.ApiClient).getEvents('1', { sync: 'old-token' })

		expect(feed).toEqual({ data: events, sync: 'next-token', has_more: true, sync_reset: false })
	})
})

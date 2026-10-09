import type { EventFeedOptions, EventGateway } from './gateway.js'

export type { EventFeedOptions } from './gateway.js'

export type EventApi = ReturnType<typeof createEventApi>

export function createEventApi(gateway: EventGateway) {
	return {
		getEvents(resourceGid: string, opts?: EventFeedOptions) {
			return gateway.getEvents(resourceGid, opts)
		},
	}
}

import { createClient } from '../platform/client.js'
import { createAsanaEventGateway, type EventFeedOptions, type EventGateway } from './gateway.js'

export type { EventFeedOptions } from './gateway.js'

export type EventApi = ReturnType<typeof createEventApi>

export function createEventApi(gateway: EventGateway) {
	return {
		getEvents(resourceGid: string, opts?: EventFeedOptions) {
			return gateway.getEvents(resourceGid, opts)
		},
	}
}

function defaultEventApi() {
	return createEventApi(createAsanaEventGateway(createClient()))
}

export async function getEvents(resourceGid: string, opts?: EventFeedOptions) {
	return defaultEventApi().getEvents(resourceGid, opts)
}

import { createClient } from '../platform/client.js'
import { createEventApi } from './api.js'
import { createAsanaEventGateway, type EventFeedOptions } from './gateway.js'

function defaultEventApi() {
	return createEventApi(createAsanaEventGateway(createClient()))
}

export async function getEvents(resourceGid: string, opts?: EventFeedOptions) {
	return defaultEventApi().getEvents(resourceGid, opts)
}

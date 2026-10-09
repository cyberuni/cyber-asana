import { createClient } from '../platform/client.js'
import {
	createAsanaSearchGateway,
	type SearchGateway,
	type TypeaheadOptions,
	type TypeaheadResourceType,
} from './gateway.js'

export { TYPEAHEAD_RESOURCE_TYPES, type TypeaheadOptions, type TypeaheadResourceType } from './gateway.js'

export type SearchApi = ReturnType<typeof createSearchApi>

export function createSearchApi(gateway: SearchGateway) {
	return {
		searchObjects(workspaceGid: string, resourceType: TypeaheadResourceType, opts?: TypeaheadOptions) {
			return gateway.searchObjects(workspaceGid, resourceType, opts)
		},
	}
}

function defaultSearchApi() {
	return createSearchApi(createAsanaSearchGateway(createClient()))
}

export async function searchObjects(
	workspaceGid: string,
	resourceType: TypeaheadResourceType,
	opts?: TypeaheadOptions,
) {
	return defaultSearchApi().searchObjects(workspaceGid, resourceType, opts)
}

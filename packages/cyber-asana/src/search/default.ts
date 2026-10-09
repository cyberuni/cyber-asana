import { createClient } from '../platform/client.js'
import { createSearchApi } from './api.js'
import { createAsanaSearchGateway, type TypeaheadOptions, type TypeaheadResourceType } from './gateway.js'

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

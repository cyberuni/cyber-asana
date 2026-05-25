import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { TagApi } from './api.js'

export type TagListPaginationAcceptanceDeps = {
	getApi: () => Pick<TagApi, 'listTags'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineTagListPaginationAcceptanceSpecs(deps: TagListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTags(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

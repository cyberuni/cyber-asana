import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { WorkspaceApi } from './api.js'

export type WorkspaceListPaginationAcceptanceDeps = {
	getApi: () => Pick<WorkspaceApi, 'listWorkspaces'>
	includeFetchAll?: boolean
}

export function defineWorkspaceListPaginationAcceptanceSpecs(deps: WorkspaceListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listWorkspaces(opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

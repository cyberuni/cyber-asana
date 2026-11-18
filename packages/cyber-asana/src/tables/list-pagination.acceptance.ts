import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { TableApi } from './api.js'

export type TableListPaginationAcceptanceDeps = {
	getApi: () => Pick<TableApi, 'listTables'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineTableListPaginationAcceptanceSpecs(deps: TableListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTables(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

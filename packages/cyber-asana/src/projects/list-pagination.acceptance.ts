import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { ProjectApi } from './api.js'

export type ProjectListPaginationAcceptanceDeps = {
	getApi: () => Pick<ProjectApi, 'listProjects'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineProjectListPaginationAcceptanceSpecs(deps: ProjectListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listProjects(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

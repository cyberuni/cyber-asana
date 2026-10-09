import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { ProjectTemplateApi } from './api.js'

export type ProjectTemplateListPaginationAcceptanceDeps = {
	getApi: () => Pick<ProjectTemplateApi, 'listProjectTemplates'>
	workspaceGid: string
	/** Asana rejects `workspace` for an organization; resolve a `team` lazily when one is needed. */
	getTeamGid?: () => Promise<string | undefined>
	includeFetchAll?: boolean
}

export function defineProjectTemplateListPaginationAcceptanceSpecs(deps: ProjectTemplateListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: async (opts) => {
			const teamGid = await deps.getTeamGid?.()
			const filters = teamGid ? { team: teamGid } : { workspace: deps.workspaceGid }
			return deps.getApi().listProjectTemplates(filters, opts)
		},
		includeFetchAll: deps.includeFetchAll,
	})
}

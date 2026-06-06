import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { SectionApi } from './api.js'

export type SectionListPaginationAcceptanceDeps = {
	getApi: () => Pick<SectionApi, 'listSections'>
	projectGid: string
	includeFetchAll?: boolean
}

export function defineSectionListPaginationAcceptanceSpecs(deps: SectionListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listSections(deps.projectGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

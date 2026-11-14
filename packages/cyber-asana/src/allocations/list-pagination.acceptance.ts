import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { AllocationApi } from './api.js'
import type { AllocationListFilters } from './gateway.js'

export type AllocationListPaginationAcceptanceDeps = {
	getApi: () => Pick<AllocationApi, 'listAllocations'>
	filters: AllocationListFilters
	includeFetchAll?: boolean
}

export function defineAllocationListPaginationAcceptanceSpecs(deps: AllocationListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listAllocations({ ...deps.filters, ...opts }),
		includeFetchAll: deps.includeFetchAll,
	})
}

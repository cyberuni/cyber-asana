import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { GoalApi } from './api.js'

export type GoalListPaginationAcceptanceDeps = {
	getApi: () => Pick<GoalApi, 'listGoals'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineGoalListPaginationAcceptanceSpecs(deps: GoalListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listGoals(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

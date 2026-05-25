import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { TaskApi } from './api.js'

export type TaskListPaginationAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'listTasks'>
	projectGid: string
	includeFetchAll?: boolean
}

export function defineTaskListPaginationAcceptanceSpecs(deps: TaskListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTasks(deps.projectGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

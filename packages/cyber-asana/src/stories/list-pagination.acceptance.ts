import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { StoryApi } from './api.js'

export type StoryListPaginationAcceptanceDeps = {
	getApi: () => Pick<StoryApi, 'listStories'>
	taskGid: string
	includeFetchAll?: boolean
}

export function defineStoryListPaginationAcceptanceSpecs(deps: StoryListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listStories(deps.taskGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

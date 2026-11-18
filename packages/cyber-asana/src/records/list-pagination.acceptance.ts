import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { RecordApi } from './api.js'

export type RecordListPaginationAcceptanceDeps = {
	getApi: () => Pick<RecordApi, 'listRecords'>
	tableGid: string
	includeFetchAll?: boolean
}

export type RecordStoryListPaginationAcceptanceDeps = {
	getApi: () => Pick<RecordApi, 'listRecordStories'>
	recordGid: string
	includeFetchAll?: boolean
}

export function defineRecordListPaginationAcceptanceSpecs(deps: RecordListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listRecords(deps.tableGid, {}, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

export function defineRecordStoryListPaginationAcceptanceSpecs(deps: RecordStoryListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listRecordStories(deps.recordGid, {}, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

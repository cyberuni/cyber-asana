import { describe, vi } from 'vitest'
import { paginatingListResult } from '../testing/paginating-gateway.js'
import { createRecordApi } from './api.js'
import type { RecordGateway } from './gateway.js'
import {
	defineRecordListPaginationAcceptanceSpecs,
	defineRecordStoryListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const pages = [[{ gid: 'a' }], [{ gid: 'b' }], [{ gid: 'c' }]]

function createPaginatingRecordGateway(): RecordGateway {
	const paged = vi.fn(async (_scope: string, _filters: unknown, opts?: Parameters<typeof paginatingListResult>[1]) =>
		paginatingListResult(pages, opts),
	)
	return {
		listRecords: paged,
		searchRecords: vi.fn(),
		getRecord: vi.fn(),
		createRecord: vi.fn(),
		updateRecord: vi.fn(),
		deleteRecord: vi.fn(),
		listRecordStories: paged,
		createRecordStory: vi.fn(),
	}
}

describe(
	'records/list pagination acceptance',
	defineRecordListPaginationAcceptanceSpecs({
		getApi: () => createRecordApi(createPaginatingRecordGateway()),
		tableGid: 't-test',
	}),
)

describe(
	'records/story list pagination acceptance',
	defineRecordStoryListPaginationAcceptanceSpecs({
		getApi: () => createRecordApi(createPaginatingRecordGateway()),
		recordGid: 'r-test',
	}),
)

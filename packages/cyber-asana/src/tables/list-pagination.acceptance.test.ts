import { describe } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createTableApi } from './api.js'
import type { TableGateway } from './gateway.js'
import { defineTableListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const pages = [[{ gid: 't1', name: 'A' }], [{ gid: 't2', name: 'B' }], [{ gid: 't3', name: 'C' }]]

function createPaginatingTableGateway(): TableGateway {
	return {
		listTables: createPaginatingScopedListMock(pages),
		getTable: async () => ({}) as never,
		createTable: async () => ({}) as never,
		updateTable: async () => ({}) as never,
		deleteTable: async () => undefined,
		listTableFields: createPaginatingScopedListMock(pages),
		addTableField: async () => ({}) as never,
		removeTableField: async () => undefined,
	}
}

describe(
	'tables/list pagination acceptance',
	defineTableListPaginationAcceptanceSpecs({
		getApi: () => createTableApi(createPaginatingTableGateway()),
		workspaceGid: 'ws-test',
	}),
)

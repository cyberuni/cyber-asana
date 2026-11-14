import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createCustomFieldApi } from './api.js'
import type { CustomFieldGateway } from './gateway.js'
import {
	defineCustomFieldListPaginationAcceptanceSpecs,
	defineCustomFieldSettingsListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'
const pages = [
	[{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }],
	[{ gid: 'cf2', name: 'Estimate', resource_subtype: 'number' }],
	[{ gid: 'cf3', name: 'Owner note', resource_subtype: 'text' }],
]

const projectGid = 'proj-test'
const settingPages = [
	[{ gid: 'cfs1', custom_field: { gid: 'cf1', name: 'Priority' } }],
	[{ gid: 'cfs2', custom_field: { gid: 'cf2', name: 'Estimate' } }],
	[{ gid: 'cfs3', custom_field: { gid: 'cf3', name: 'Owner note' } }],
]

function createPaginatingCustomFieldGateway(): CustomFieldGateway {
	return {
		listCustomFields: createPaginatingScopedListMock(pages),
		getCustomField: vi.fn(),
		listCustomFieldSettingsForProject: createPaginatingScopedListMock(settingPages),
		listCustomFieldSettingsForPortfolio: vi.fn(),
		listCustomFieldSettingsForGoal: vi.fn(),
		listCustomFieldSettingsForTeam: vi.fn(),
		createCustomField: vi.fn(),
		createEnumOption: vi.fn(),
		insertEnumOption: vi.fn(),
		updateEnumOption: vi.fn(),
		addCustomFieldToProject: vi.fn(),
		removeCustomFieldFromProject: vi.fn(),
	}
}

describe(
	'custom-fields/list pagination acceptance',
	defineCustomFieldListPaginationAcceptanceSpecs({
		getApi: () => createCustomFieldApi(createPaginatingCustomFieldGateway()),
		workspaceGid,
	}),
)

describe('custom-fields/list pagination acceptance gateway double', () => {
	it('exercises listCustomFields without importing the Asana SDK', async () => {
		const gateway = createPaginatingCustomFieldGateway()
		const api = createCustomFieldApi(gateway)

		const result = await api.listCustomFields(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listCustomFields).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})

describe(
	'custom-fields/settings list pagination acceptance',
	defineCustomFieldSettingsListPaginationAcceptanceSpecs({
		getApi: () => createCustomFieldApi(createPaginatingCustomFieldGateway()),
		projectGid,
	}),
)

describe('custom-fields/settings list pagination acceptance gateway double', () => {
	it('exercises listCustomFieldSettingsForProject without importing the Asana SDK', async () => {
		const gateway = createPaginatingCustomFieldGateway()
		const api = createCustomFieldApi(gateway)

		const result = await api.listCustomFieldSettingsForProject(projectGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'cfs1', custom_field: { gid: 'cf1', name: 'Priority' } }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listCustomFieldSettingsForProject).toHaveBeenCalledWith(projectGid, { limit: 25 })
	})
})

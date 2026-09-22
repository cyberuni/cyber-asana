import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	createCustomFieldApi,
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
} from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockCustomField = { gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }

describe('createCustomFieldApi', () => {
	it('uses the provided gateway for listCustomFields', async () => {
		const mockListCustomFields = vi.fn().mockResolvedValue({ data: [mockCustomField], next_page: null, limit: 100 })
		const api = createCustomFieldApi({
			listCustomFields: mockListCustomFields,
			getCustomField: vi.fn(),
			listCustomFieldSettingsForProject: vi.fn(),
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
		})

		const result = await api.listCustomFields('ws1')

		expect(result).toEqual({ data: [mockCustomField], next_page: null, limit: 100 })
		expect(mockListCustomFields).toHaveBeenCalledWith('ws1', undefined)
	})

	it('uses the provided gateway for getCustomField', async () => {
		const mockGetCustomField = vi.fn().mockResolvedValue(mockCustomField)
		const api = createCustomFieldApi({
			listCustomFields: vi.fn(),
			getCustomField: mockGetCustomField,
			listCustomFieldSettingsForProject: vi.fn(),
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
		})

		const result = await api.getCustomField('cf1')

		expect(result).toEqual(mockCustomField)
		expect(mockGetCustomField).toHaveBeenCalledWith('cf1', undefined)
	})
})

const mockSetting = {
	gid: 'cfs1',
	custom_field: { gid: 'cf1', name: 'Priority', resource_subtype: 'enum' },
}

function settingsGatewayStub() {
	return {
		listCustomFields: vi.fn(),
		getCustomField: vi.fn(),
		listCustomFieldSettingsForProject: vi.fn(),
		listCustomFieldSettingsForPortfolio: vi.fn(),
		listCustomFieldSettingsForGoal: vi.fn(),
		listCustomFieldSettingsForTeam: vi.fn(),
	}
}

describe('custom-fields/api custom field settings', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listCustomFieldSettingsForProject calls getCustomFieldSettingsForProject', async () => {
		vi.spyOn(Asana.CustomFieldSettingsApi.prototype, 'getCustomFieldSettingsForProject').mockResolvedValue({
			data: [mockSetting],
		} as never)

		const result = await listCustomFieldSettingsForProject('proj1')

		expect(result).toEqual({ data: [mockSetting], next_page: null, limit: 100 })
		expect(Asana.CustomFieldSettingsApi.prototype.getCustomFieldSettingsForProject).toHaveBeenCalledWith('proj1', {
			limit: 100,
		})
	})

	it('listCustomFieldSettingsForPortfolio calls getCustomFieldSettingsForPortfolio', async () => {
		vi.spyOn(Asana.CustomFieldSettingsApi.prototype, 'getCustomFieldSettingsForPortfolio').mockResolvedValue({
			data: [mockSetting],
		} as never)

		const result = await listCustomFieldSettingsForPortfolio('port1', { optFields: 'custom_field.name' })

		expect(result).toEqual([mockSetting])
		expect(Asana.CustomFieldSettingsApi.prototype.getCustomFieldSettingsForPortfolio).toHaveBeenCalledWith('port1', {
			limit: 100,
			opt_fields: 'custom_field.name',
		})
	})

	it('listCustomFieldSettingsForGoal calls getCustomFieldSettingsForGoal', async () => {
		vi.spyOn(Asana.CustomFieldSettingsApi.prototype, 'getCustomFieldSettingsForGoal').mockResolvedValue({
			data: [mockSetting],
		} as never)

		const result = await listCustomFieldSettingsForGoal('goal1')

		expect(result).toEqual({ data: [mockSetting], next_page: null, limit: 100 })
		expect(Asana.CustomFieldSettingsApi.prototype.getCustomFieldSettingsForGoal).toHaveBeenCalledWith('goal1', {
			limit: 100,
		})
	})

	it('listCustomFieldSettingsForTeam calls getCustomFieldSettingsForTeam', async () => {
		vi.spyOn(Asana.CustomFieldSettingsApi.prototype, 'getCustomFieldSettingsForTeam').mockResolvedValue({
			data: [mockSetting],
		} as never)

		const result = await listCustomFieldSettingsForTeam('team1')

		expect(result).toEqual({ data: [mockSetting], next_page: null, limit: 100 })
		expect(Asana.CustomFieldSettingsApi.prototype.getCustomFieldSettingsForTeam).toHaveBeenCalledWith('team1', {
			limit: 100,
		})
	})

	it('createCustomFieldApi uses the provided gateway for the settings reads', async () => {
		const mockList = vi.fn().mockResolvedValue({ data: [mockSetting], next_page: null, limit: 100 })
		const api = createCustomFieldApi({ ...settingsGatewayStub(), listCustomFieldSettingsForProject: mockList })

		const result = await api.listCustomFieldSettingsForProject('proj1')

		expect(result).toEqual({ data: [mockSetting], next_page: null, limit: 100 })
		expect(mockList).toHaveBeenCalledWith('proj1', undefined)
	})
})

import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCustomFieldApi } from './api.js'
import {
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
} from './default.js'

vi.mock('../platform/client.js', () => ({
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
			createCustomField: vi.fn(),
			createEnumOption: vi.fn(),
			insertEnumOption: vi.fn(),
			updateEnumOption: vi.fn(),
			addCustomFieldToProject: vi.fn(),
			removeCustomFieldFromProject: vi.fn(),
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
			createCustomField: vi.fn(),
			createEnumOption: vi.fn(),
			insertEnumOption: vi.fn(),
			updateEnumOption: vi.fn(),
			addCustomFieldToProject: vi.fn(),
			removeCustomFieldFromProject: vi.fn(),
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
		createCustomField: vi.fn(),
		createEnumOption: vi.fn(),
		insertEnumOption: vi.fn(),
		updateEnumOption: vi.fn(),
		addCustomFieldToProject: vi.fn(),
		removeCustomFieldFromProject: vi.fn(),
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

describe('custom-fields/api writes', () => {
	const gateway = (over: Record<string, unknown>) => ({ ...settingsGatewayStub(), ...over }) as never

	it('attachCustomField attaches a field the project lacks', async () => {
		const add = vi.fn().mockResolvedValue({ gid: 's1' })
		const api = createCustomFieldApi(
			gateway({
				listCustomFieldSettingsForProject: vi.fn().mockResolvedValue({ data: [], next_page: null, limit: 100 }),
				addCustomFieldToProject: add,
			}),
		)

		const result = await api.attachCustomField('p1', 'cf1', { isImportant: true })

		expect(add).toHaveBeenCalledWith('p1', 'cf1', { isImportant: true })
		expect(result).toEqual({ project: 'p1', custom_field: 'cf1', status: 'attached' })
	})

	it('attachCustomField is a no-op when the project already has the field', async () => {
		const add = vi.fn()
		const api = createCustomFieldApi(
			gateway({
				listCustomFieldSettingsForProject: vi.fn().mockResolvedValue([{ gid: 's1', custom_field: { gid: 'cf1' } }]),
				addCustomFieldToProject: add,
			}),
		)

		expect(await api.attachCustomField('p1', 'cf1')).toEqual({
			project: 'p1',
			custom_field: 'cf1',
			status: 'already_attached',
		})
		expect(add).not.toHaveBeenCalled()
	})

	it('detachCustomField is a no-op when the field is not attached', async () => {
		const remove = vi.fn()
		const api = createCustomFieldApi(
			gateway({
				listCustomFieldSettingsForProject: vi.fn().mockResolvedValue([]),
				removeCustomFieldFromProject: remove,
			}),
		)

		expect(await api.detachCustomField('p1', 'cf1')).toEqual({
			project: 'p1',
			custom_field: 'cf1',
			status: 'already_detached',
		})
		expect(remove).not.toHaveBeenCalled()
	})

	it('detachCustomField removes an attached field', async () => {
		const remove = vi.fn().mockResolvedValue(undefined)
		const api = createCustomFieldApi(
			gateway({
				listCustomFieldSettingsForProject: vi.fn().mockResolvedValue([{ custom_field: { gid: 'cf1' } }]),
				removeCustomFieldFromProject: remove,
			}),
		)

		expect((await api.detachCustomField('p1', 'cf1')).status).toBe('detached')
		expect(remove).toHaveBeenCalledWith('p1', 'cf1')
	})

	it('passes field and enum-option writes through to the gateway', async () => {
		const g = {
			createCustomField: vi.fn().mockResolvedValue({ gid: 'cf1' }),
			createEnumOption: vi.fn().mockResolvedValue({ gid: 'o1' }),
			insertEnumOption: vi.fn().mockResolvedValue({ gid: 'o1' }),
			updateEnumOption: vi.fn().mockResolvedValue({ gid: 'o1' }),
		}
		const api = createCustomFieldApi(gateway(g))

		await api.createCustomField({ workspace: 'ws', name: 'Sprint', resourceSubtype: 'enum' })
		await api.createEnumOption('cf1', { name: 'Sprint 1' })
		await api.insertEnumOption('cf1', { enumOption: 'o1', afterEnumOption: 'o0' })
		await api.updateEnumOption('o1', { enabled: false })

		expect(g.createCustomField).toHaveBeenCalledWith({ workspace: 'ws', name: 'Sprint', resourceSubtype: 'enum' })
		expect(g.createEnumOption).toHaveBeenCalledWith('cf1', { name: 'Sprint 1' })
		expect(g.insertEnumOption).toHaveBeenCalledWith('cf1', { enumOption: 'o1', afterEnumOption: 'o0' })
		expect(g.updateEnumOption).toHaveBeenCalledWith('o1', { enabled: false })
	})
})

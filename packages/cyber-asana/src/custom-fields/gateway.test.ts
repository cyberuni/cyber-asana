import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaCustomFieldGateway } from './gateway.js'

const client = {} as Asana.ApiClient

describe('custom-fields/gateway writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it('createCustomField sends the workspace, name, type, and enum options as the request body', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'createCustomField')
			.mockResolvedValue({ data: { gid: 'cf1' } } as never)

		const result = await createAsanaCustomFieldGateway(client).createCustomField({
			workspace: 'ws1',
			name: 'Sprint',
			resourceSubtype: 'enum',
			enumOptions: [{ name: 'Sprint 1', color: 'blue' }],
		})

		expect(result).toEqual({ gid: 'cf1' })
		expect(spy).toHaveBeenCalledWith(
			{
				data: {
					workspace: 'ws1',
					name: 'Sprint',
					resource_subtype: 'enum',
					enum_options: [{ name: 'Sprint 1', color: 'blue' }],
				},
			},
			{},
		)
	})

	it('createCustomField sends the number format, label, notification, id prefix, and input restriction fields', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'createCustomField')
			.mockResolvedValue({ data: { gid: 'cf1' } } as never)

		await createAsanaCustomFieldGateway(client).createCustomField({
			workspace: 'ws1',
			name: 'Cost',
			resourceSubtype: 'number',
			format: 'custom',
			currencyCode: 'USD',
			customLabel: 'pts',
			customLabelPosition: 'suffix',
			hasNotificationsEnabled: true,
			idPrefix: 'BUG',
			inputRestrictions: ['task', 'project'],
		})

		expect(spy).toHaveBeenCalledWith(
			{
				data: {
					workspace: 'ws1',
					name: 'Cost',
					resource_subtype: 'number',
					format: 'custom',
					currency_code: 'USD',
					custom_label: 'pts',
					custom_label_position: 'suffix',
					has_notifications_enabled: true,
					id_prefix: 'BUG',
					input_restrictions: ['task', 'project'],
				},
			},
			{},
		)
	})

	it('updateCustomField sends the notification, id prefix, and input restriction fields', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'updateCustomField')
			.mockResolvedValue({ data: { gid: 'cf1' } } as never)

		await createAsanaCustomFieldGateway(client).updateCustomField('cf1', {
			hasNotificationsEnabled: false,
			idPrefix: 'ID',
			inputRestrictions: ['goal'],
		})

		expect(spy).toHaveBeenCalledWith('cf1', {
			body: { data: { has_notifications_enabled: false, id_prefix: 'ID', input_restrictions: ['goal'] } },
		})
	})

	it('createEnumOption sends enabled', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'createEnumOptionForCustomField')
			.mockResolvedValue({ data: { gid: 'o1' } } as never)

		await createAsanaCustomFieldGateway(client).createEnumOption('cf1', { name: 'Old', enabled: false })

		expect(spy).toHaveBeenCalledWith('cf1', { body: { data: { name: 'Old', enabled: false } } })
	})

	it('createEnumOption sends the option and its placement', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'createEnumOptionForCustomField')
			.mockResolvedValue({ data: { gid: 'o1' } } as never)

		await createAsanaCustomFieldGateway(client).createEnumOption('cf1', { name: 'Sprint 2', insertAfter: 'o0' })

		expect(spy).toHaveBeenCalledWith('cf1', { body: { data: { name: 'Sprint 2', insert_after: 'o0' } } })
	})

	it('insertEnumOption reorders an option before another', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'insertEnumOptionForCustomField')
			.mockResolvedValue({ data: { gid: 'o1' } } as never)

		await createAsanaCustomFieldGateway(client).insertEnumOption('cf1', { enumOption: 'o1', beforeEnumOption: 'o0' })

		expect(spy).toHaveBeenCalledWith('cf1', { body: { data: { enum_option: 'o1', before_enum_option: 'o0' } } })
	})

	it('updateEnumOption sends only the changed properties', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'updateEnumOption')
			.mockResolvedValue({ data: { gid: 'o1' } } as never)

		await createAsanaCustomFieldGateway(client).updateEnumOption('o1', { enabled: false })

		expect(spy).toHaveBeenCalledWith('o1', { body: { data: { enabled: false } } })
	})

	it('updateCustomField sends only the changed properties, mapped to Asana names', async () => {
		const spy = vi
			.spyOn(Asana.CustomFieldsApi.prototype, 'updateCustomField')
			.mockResolvedValue({ data: { gid: 'cf1' } } as never)

		const result = await createAsanaCustomFieldGateway(client).updateCustomField('cf1', {
			name: 'Cost',
			precision: 2,
			currencyCode: 'USD',
			enabled: false,
		})

		expect(result).toEqual({ gid: 'cf1' })
		expect(spy).toHaveBeenCalledWith('cf1', {
			body: { data: { name: 'Cost', precision: 2, currency_code: 'USD', enabled: false } },
		})
	})

	it('deleteCustomField deletes the field by GID', async () => {
		const spy = vi.spyOn(Asana.CustomFieldsApi.prototype, 'deleteCustomField').mockResolvedValue({ data: {} } as never)

		await createAsanaCustomFieldGateway(client).deleteCustomField('cf1')

		expect(spy).toHaveBeenCalledWith('cf1')
	})

	it('addCustomFieldToProject creates the setting with the field GID', async () => {
		const spy = vi
			.spyOn(Asana.ProjectsApi.prototype, 'addCustomFieldSettingForProject')
			.mockResolvedValue({ data: { gid: 's1' } } as never)

		await createAsanaCustomFieldGateway(client).addCustomFieldToProject('p1', 'cf1', { isImportant: true })

		expect(spy).toHaveBeenCalledWith({ data: { custom_field: 'cf1', is_important: true } }, 'p1')
	})

	it('removeCustomFieldFromProject deletes the setting by field GID', async () => {
		const spy = vi
			.spyOn(Asana.ProjectsApi.prototype, 'removeCustomFieldSettingForProject')
			.mockResolvedValue({ data: {} } as never)

		await createAsanaCustomFieldGateway(client).removeCustomFieldFromProject('p1', 'cf1')

		expect(spy).toHaveBeenCalledWith({ data: { custom_field: 'cf1' } }, 'p1')
	})
})

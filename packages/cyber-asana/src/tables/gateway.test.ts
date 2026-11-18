import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaTableGateway } from './gateway.js'

const client = {} as Asana.ApiClient
const proto = Asana.TablesApi.prototype

describe('tables/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTables lists the workspace tables with default pagination', async () => {
		const spy = vi.spyOn(proto, 'getTablesForWorkspace').mockResolvedValue({ data: [{ gid: 't1' }] } as never)

		const result = await createAsanaTableGateway(client).listTables('ws1', { limit: 5 })

		expect(spy).toHaveBeenCalledWith('ws1', { limit: 5 })
		expect(result).toEqual({ data: [{ gid: 't1' }], next_page: null, limit: 5 })
	})

	it('getTable unwraps data and forwards opt_fields', async () => {
		const spy = vi.spyOn(proto, 'getTable').mockResolvedValue({ data: { gid: 't1' } } as never)

		expect(await createAsanaTableGateway(client).getTable('t1', { optFields: 'name' })).toEqual({ gid: 't1' })
		expect(spy).toHaveBeenCalledWith('t1', { opt_fields: 'name' })
	})

	it('createTable sends the workspace as a plain string with the name', async () => {
		const spy = vi.spyOn(proto, 'createTable').mockResolvedValue({ data: { gid: 't1' } } as never)

		await createAsanaTableGateway(client).createTable('ws1', 'Renewals')

		expect(spy).toHaveBeenCalledWith({ data: { name: 'Renewals', workspace: 'ws1' } }, {})
	})

	it('updateTable sends only the given fields', async () => {
		const spy = vi.spyOn(proto, 'updateTable').mockResolvedValue({ data: { gid: 't1' } } as never)

		await createAsanaTableGateway(client).updateTable('t1', { default_access_level: 'viewer' })

		expect(spy).toHaveBeenCalledWith({ data: { default_access_level: 'viewer' } }, 't1', {})
	})

	it('deleteTable deletes by gid', async () => {
		const spy = vi.spyOn(proto, 'deleteTable').mockResolvedValue({ data: {} } as never)

		await createAsanaTableGateway(client).deleteTable('t1')

		expect(spy).toHaveBeenCalledWith('t1')
	})

	it('listTableFields reads the table custom field settings', async () => {
		const spy = vi.spyOn(proto, 'getCustomFieldSettingsForTable').mockResolvedValue({ data: [{ gid: 's1' }] } as never)

		const result = await createAsanaTableGateway(client).listTableFields('t1')

		expect(spy).toHaveBeenCalledWith('t1', { limit: 100 })
		expect(result).toEqual({ data: [{ gid: 's1' }], next_page: null, limit: 100 })
	})

	it('addTableField maps options to the snake_case request', async () => {
		const spy = vi.spyOn(proto, 'addCustomFieldSettingForTable').mockResolvedValue({ data: { gid: 's1' } } as never)

		await createAsanaTableGateway(client).addTableField('t1', 'cf1', { isImportant: true, insertAfter: 's0' })

		expect(spy).toHaveBeenCalledWith(
			{ data: { custom_field: 'cf1', is_important: true, insert_after: 's0' } },
			't1',
			{},
		)
	})

	it('removeTableField posts the custom field gid', async () => {
		const spy = vi.spyOn(proto, 'removeCustomFieldSettingForTable').mockResolvedValue({ data: {} } as never)

		await createAsanaTableGateway(client).removeTableField('t1', 'cf1')

		expect(spy).toHaveBeenCalledWith({ data: { custom_field: 'cf1' } }, 't1')
	})
})

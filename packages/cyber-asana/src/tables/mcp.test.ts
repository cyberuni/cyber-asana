import { describe, expect, it, vi } from 'vitest'
import type { TableApi } from './api.js'
import { registerTableTools } from './mcp.js'

type Handler = (params: any) => Promise<{ content: { text: string }[] }>

function setup(api: Partial<TableApi>) {
	const handlers = new Map<string, Handler>()
	registerTableTools(
		{ tool: (name: string, _d: string, _s: unknown, h: Handler) => handlers.set(name, h) } as never,
		api as TableApi,
	)
	return handlers
}

describe('tables/mcp', () => {
	it('registers the table tools', () => {
		expect([...setup({}).keys()].sort()).toEqual([
			'asana_table_add_field',
			'asana_table_create',
			'asana_table_delete',
			'asana_table_fields_list',
			'asana_table_get',
			'asana_table_list',
			'asana_table_remove_field',
			'asana_table_update',
		])
	})

	it('asana_table_list forwards the workspace and pagination', async () => {
		const listTables = vi.fn().mockResolvedValue([{ gid: 't1' }])
		const res = await setup({ listTables }).get('asana_table_list')!({
			workspace_gid: 'ws1',
			limit: 5,
			fetch_all: true,
		})

		expect(listTables).toHaveBeenCalledWith('ws1', expect.objectContaining({ limit: 5, fetchAll: true }))
		expect(JSON.parse(res.content[0].text)).toEqual([{ gid: 't1' }])
	})

	it('asana_table_create and update forward their fields', async () => {
		const createTable = vi.fn().mockResolvedValue({ gid: 't1' })
		const updateTable = vi.fn().mockResolvedValue({ gid: 't1' })
		const h = setup({ createTable, updateTable })

		await h.get('asana_table_create')!({ workspace_gid: 'ws1', name: 'R' })
		await h.get('asana_table_update')!({ table_gid: 't1', name: 'N', default_access_level: 'editor' })

		expect(createTable).toHaveBeenCalledWith('ws1', 'R')
		expect(updateTable).toHaveBeenCalledWith('t1', { name: 'N', default_access_level: 'editor' })
	})

	it('asana_table_delete is idempotent', async () => {
		const deleteTable = vi
			.fn()
			.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const res = await setup({ deleteTable }).get('asana_table_delete')!({ table_gid: 't1' })

		expect(JSON.parse(res.content[0].text)).toEqual({
			deleted: true,
			resource: 'table',
			gid: 't1',
			already_absent: true,
		})
	})

	it('asana_table_add_field and remove_field forward the custom field', async () => {
		const addTableField = vi.fn().mockResolvedValue({ gid: 's1' })
		const removeTableField = vi.fn().mockResolvedValue(undefined)
		const h = setup({ addTableField, removeTableField })

		await h.get('asana_table_add_field')!({ table_gid: 't1', custom_field_gid: 'cf1', is_important: true })
		await h.get('asana_table_remove_field')!({ table_gid: 't1', custom_field_gid: 'cf1' })

		expect(addTableField).toHaveBeenCalledWith('t1', 'cf1', { isImportant: true })
		expect(removeTableField).toHaveBeenCalledWith('t1', 'cf1')
	})
})

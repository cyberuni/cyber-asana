import { describe, expect, it, vi } from 'vitest'
import { createTableApi } from './api.js'
import type { TableGateway } from './gateway.js'

function gatewayDouble(overrides: Partial<TableGateway> = {}): TableGateway {
	return {
		listTables: vi.fn(),
		getTable: vi.fn(),
		createTable: vi.fn(),
		updateTable: vi.fn(),
		deleteTable: vi.fn(),
		listTableFields: vi.fn(),
		addTableField: vi.fn(),
		removeTableField: vi.fn(),
		...overrides,
	}
}

describe('createTableApi', () => {
	it('delegates every operation to the gateway', async () => {
		const gateway = gatewayDouble()
		const api = createTableApi(gateway)

		await api.listTables('ws1', { limit: 3 })
		await api.getTable('t1', { optFields: 'name' })
		await api.createTable('ws1', 'Renewals')
		await api.updateTable('t1', { name: 'New' })
		await api.deleteTable('t1')
		await api.listTableFields('t1', { limit: 2 })
		await api.addTableField('t1', 'cf1', { isImportant: true })
		await api.removeTableField('t1', 'cf1')

		expect(gateway.listTables).toHaveBeenCalledWith('ws1', { limit: 3 })
		expect(gateway.getTable).toHaveBeenCalledWith('t1', { optFields: 'name' })
		expect(gateway.createTable).toHaveBeenCalledWith('ws1', 'Renewals')
		expect(gateway.updateTable).toHaveBeenCalledWith('t1', { name: 'New' })
		expect(gateway.deleteTable).toHaveBeenCalledWith('t1')
		expect(gateway.listTableFields).toHaveBeenCalledWith('t1', { limit: 2 })
		expect(gateway.addTableField).toHaveBeenCalledWith('t1', 'cf1', { isImportant: true })
		expect(gateway.removeTableField).toHaveBeenCalledWith('t1', 'cf1')
	})
})

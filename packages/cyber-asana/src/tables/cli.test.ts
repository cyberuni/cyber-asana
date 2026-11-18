import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TableApi } from './api.js'
import { tableCommand } from './cli.js'

function apiDouble(overrides: Partial<TableApi> = {}): TableApi {
	return {
		listTables: vi.fn().mockResolvedValue([]),
		getTable: vi.fn(),
		createTable: vi.fn(),
		updateTable: vi.fn(),
		deleteTable: vi.fn(),
		listTableFields: vi.fn().mockResolvedValue([]),
		addTableField: vi.fn(),
		removeTableField: vi.fn(),
		...overrides,
	} as TableApi
}

async function run(api: TableApi, ...args: string[]) {
	const program = new Command().addCommand(tableCommand(api))
	await program.parseAsync(['node', 'test', 'table', ...args], { from: 'node' })
}

describe('tables/cli', () => {
	afterEach(() => vi.restoreAllMocks())

	it('table list uses a minimal default field set, a count summary, and next steps', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ listTables: vi.fn().mockResolvedValue([{ gid: 't1', name: 'Renewals' }]) })

		await run(api, 'list', '--workspace-gid', 'ws1')

		expect(api.listTables).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name' }))
		const lines = log.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 table(s)')
		expect(lines.some((l) => l.includes('cyber-asana table get <gid>'))).toBe(true)
	})

	it('table list names an empty result', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run(apiDouble(), 'list', '--workspace-gid', 'ws1')

		expect(log.mock.calls.map((c) => String(c[0]))).toContain('0 tables found')
	})

	it('table get forwards --opt-fields', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ getTable: vi.fn().mockResolvedValue({ gid: 't1', name: 'R' }) })

		await run(api, 'get', 't1', '--opt-fields', 'name')

		expect(api.getTable).toHaveBeenCalledWith('t1', { optFields: 'name' })
	})

	it('table create takes the workspace and name', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ createTable: vi.fn().mockResolvedValue({ gid: 't1', name: 'R' }) })

		await run(api, 'create', 'Renewals', '--workspace-gid', 'ws1')

		expect(api.createTable).toHaveBeenCalledWith('ws1', 'Renewals')
	})

	it('table update sends name and access level', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ updateTable: vi.fn().mockResolvedValue({ gid: 't1' }) })

		await run(api, 'update', 't1', '--name', 'N', '--default-access-level', 'viewer')

		expect(api.updateTable).toHaveBeenCalledWith('t1', { name: 'N', default_access_level: 'viewer' })
	})

	it('table update rejects an unknown access level and an empty update', async () => {
		const api = apiDouble()

		await expect(run(api, 'update', 't1', '--default-access-level', 'god')).rejects.toThrow(/access level/i)
		await expect(run(api, 'update', 't1')).rejects.toThrow(/nothing to update/i)
		expect(api.updateTable).not.toHaveBeenCalled()
	})

	it('table delete is idempotent on a 404', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({
			deleteTable: vi
				.fn()
				.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } }),
		})

		await run(api, 'delete', 't1')

		expect(log.mock.calls.map((c) => String(c[0]))).toContain('Table t1 was already deleted')
	})

	it('table fields lists the custom field settings', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble()

		await run(api, 'fields', 't1')

		expect(api.listTableFields).toHaveBeenCalledWith('t1', expect.objectContaining({ optFields: expect.any(String) }))
	})

	it('table add-field and remove-field pass the custom field gid', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({
			addTableField: vi.fn().mockResolvedValue({ gid: 's1' }),
			removeTableField: vi.fn().mockResolvedValue(undefined),
		})

		await run(api, 'add-field', 't1', 'cf1', '--important', '--insert-before', 's0')
		await run(api, 'remove-field', 't1', 'cf1')

		expect(api.addTableField).toHaveBeenCalledWith('t1', 'cf1', { isImportant: true, insertBefore: 's0' })
		expect(api.removeTableField).toHaveBeenCalledWith('t1', 'cf1')
	})
})

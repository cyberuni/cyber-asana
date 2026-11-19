import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { tableCommand } from './cli.js'
import { createAsanaTableGateway } from './gateway.js'
import { registerTableTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }

describe('tables opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		['createTable', (g: any) => g.createTable('w', 'n', opts)],
		['updateTable', (g: any) => g.updateTable('t', { name: 'x' }, opts)],
		['addCustomFieldSettingForTable', (g: any) => g.addTableField('t', 'f', undefined, opts)],
	])('gateway %s sends opt_fields', async (sdk, call) => {
		const spy = vi.spyOn(Asana.TablesApi.prototype as any, sdk).mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaTableGateway(client))
		expect(JSON.stringify(spy.mock.calls[0])).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[['table', 'create', 'N', '--workspace', 'ws', '--opt-fields', 'a,b'], 'createTable'],
		[['table', 'update', 't', '--name', 'x', '--opt-fields', 'a,b'], 'updateTable'],
		[['table', 'add-field', 't', 'f', '--opt-fields', 'a,b'], 'addTableField'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(tableCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		['asana_table_create', 'createTable', { workspace_gid: 'ws', name: 'n' }],
		['asana_table_update', 'updateTable', { table_gid: 't', name: 'x' }],
		['asana_table_add_field', 'addTableField', { table_gid: 't', custom_field_gid: 'f' }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerTableTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { customFieldCommand } from './cli.js'
import { createAsanaCustomFieldGateway } from './gateway.js'
import { registerCustomFieldTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }

describe('custom-fields opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		[
			'createCustomField',
			(g: any) => g.createCustomField({ workspace: 'w', name: 'n', resourceSubtype: 'text' }, opts),
		],
		['updateCustomField', (g: any) => g.updateCustomField('f', { name: 'x' }, opts)],
		['createEnumOptionForCustomField', (g: any) => g.createEnumOption('f', { name: 'x' }, opts)],
		['updateEnumOption', (g: any) => g.updateEnumOption('o', { name: 'x' }, opts)],
	])('gateway %s sends opt_fields', async (sdk, call) => {
		const spy = vi.spyOn(Asana.CustomFieldsApi.prototype as any, sdk).mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaCustomFieldGateway(client))
		const last = JSON.stringify(spy.mock.calls[0])
		expect(last).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[['custom-field', 'create', 'N', '--workspace', 'ws', '--opt-fields', 'a,b'], 'createCustomField'],
		[['custom-field', 'update', 'f', '--name', 'x', '--opt-fields', 'a,b'], 'updateCustomField'],
		[['custom-field', 'enum-option', 'add', 'f', 'x', '--opt-fields', 'a,b'], 'createEnumOption'],
		[['custom-field', 'enum-option', 'update', 'o', '--name', 'x', '--opt-fields', 'a,b'], 'updateEnumOption'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(customFieldCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		['asana_custom_field_create', 'createCustomField', { workspace_gid: 'ws', name: 'n', type: 'text' }],
		['asana_custom_field_update', 'updateCustomField', { custom_field_gid: 'f', name: 'x' }],
		['asana_custom_field_enum_option_create', 'createEnumOption', { custom_field_gid: 'f', name: 'x' }],
		['asana_custom_field_enum_option_update', 'updateEnumOption', { enum_option_gid: 'o', name: 'x' }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerCustomFieldTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

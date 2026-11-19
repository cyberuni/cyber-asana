import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { oooCommand } from './cli.js'
import { createAsanaOooGateway } from './gateway.js'
import { registerOooTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }

describe('ooo opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		[
			'createOooEntry',
			(g: any) => g.createOooEntry('u', 'w', { start_date: '2026-01-01', end_date: '2026-01-02' }, opts),
		],
		['updateOooEntry', (g: any) => g.updateOooEntry('e', { end_date: '2026-02-01' }, opts)],
	])('gateway %s sends opt_fields', async (sdk, call) => {
		const spy = vi.spyOn(Asana.OooEntriesApi.prototype as any, sdk).mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaOooGateway(client))
		expect(JSON.stringify(spy.mock.calls[0])).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[
			[
				'ooo',
				'create',
				'--workspace',
				'w',
				'--start-date',
				'2026-01-01',
				'--end-date',
				'2026-01-02',
				'--opt-fields',
				'a,b',
			],
			'createOooEntry',
		],
		[['ooo', 'update', 'e', '--end-date', '2026-02-01', '--opt-fields', 'a,b'], 'updateOooEntry'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(oooCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		['asana_ooo_create', 'createOooEntry', { workspace_gid: 'w', start_date: '2026-01-01', end_date: '2026-01-02' }],
		['asana_ooo_update', 'updateOooEntry', { ooo_entry_gid: 'e', end_date: '2026-02-01' }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerOooTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

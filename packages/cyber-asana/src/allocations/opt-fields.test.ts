import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { allocationCommand } from './cli.js'
import { createAsanaAllocationGateway } from './gateway.js'
import { registerAllocationTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }
const create = { assignee: 'u', parent: 'p', start_date: '2026-01-01', end_date: '2026-01-02' }

describe('allocations opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		['createAllocation', (g: any) => g.createAllocation(create, opts)],
		['updateAllocation', (g: any) => g.updateAllocation('a', { end_date: '2026-02-01' }, opts)],
	])('gateway %s sends opt_fields', async (sdk, call) => {
		const spy = vi.spyOn(Asana.AllocationsApi.prototype as any, sdk).mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaAllocationGateway(client))
		expect(JSON.stringify(spy.mock.calls[0])).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[
			[
				'allocation',
				'create',
				'--assignee',
				'u',
				'--parent',
				'p',
				'--start-date',
				'2026-01-01',
				'--end-date',
				'2026-01-02',
				'--opt-fields',
				'a,b',
			],
			'createAllocation',
		],
		[['allocation', 'update', 'a', '--end-date', '2026-02-01', '--opt-fields', 'a,b'], 'updateAllocation'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(allocationCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		[
			'asana_allocation_create',
			'createAllocation',
			{ assignee_gid: 'u', parent_gid: 'p', start_date: '2026-01-01', end_date: '2026-01-02' },
		],
		['asana_allocation_update', 'updateAllocation', { allocation_gid: 'a', end_date: '2026-02-01' }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerAllocationTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

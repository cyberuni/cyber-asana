import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { timeTrackingEntryCommand } from './cli.js'
import { createAsanaTimeTrackingEntryGateway } from './gateway.js'
import { registerTimeTrackingEntryTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }

describe('time-tracking opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		['createTimeTrackingEntry', (g: any) => g.createTimeTrackingEntry('t', { durationMinutes: 5 }, opts)],
		['updateTimeTrackingEntry', (g: any) => g.updateTimeTrackingEntry('e', { durationMinutes: 5 }, opts)],
	])('gateway %s sends opt_fields', async (sdk, call) => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype as any, sdk)
			.mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaTimeTrackingEntryGateway(client))
		expect(JSON.stringify(spy.mock.calls[0])).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[['time-entry', 'create', 't', '--minutes', '5', '--opt-fields', 'a,b'], 'createTimeTrackingEntry'],
		[['time-entry', 'update', 'e', '--minutes', '5', '--opt-fields', 'a,b'], 'updateTimeTrackingEntry'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(timeTrackingEntryCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		['asana_time_entry_create', 'createTimeTrackingEntry', { task_gid: 't', duration_minutes: 5 }],
		['asana_time_entry_update', 'updateTimeTrackingEntry', { time_entry_gid: 'e', duration_minutes: 5 }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerTimeTrackingEntryTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

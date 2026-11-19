import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastArg, mcpServer, runCli, stubApi } from '../testing/opt-fields-harness.js'
import { recordCommand } from './cli.js'
import { createAsanaRecordGateway } from './gateway.js'
import { registerRecordTools } from './mcp.js'

const client = {} as Asana.ApiClient
const opts = { optFields: 'a,b' }

describe('records opt_fields on writes', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each([
		[Asana.RecordsApi, 'createRecord', (g: any) => g.createRecord('t', 'n', undefined, opts)],
		[Asana.RecordsApi, 'updateRecord', (g: any) => g.updateRecord('r', { name: 'x' }, opts)],
		[Asana.StoriesApi, 'createStoryForRecord', (g: any) => g.createRecordStory('r', { text: 'x' }, opts)],
	])('gateway %#  sends opt_fields', async (Api, sdk, call) => {
		const spy = vi.spyOn(Api.prototype as any, sdk).mockResolvedValue({ data: { gid: '1' } } as never)
		await call(createAsanaRecordGateway(client))
		expect(JSON.stringify(spy.mock.calls[0])).toContain('"opt_fields":"a,b"')
	})

	it.each([
		[['record', 'create', 'N', '--table', 't', '--opt-fields', 'a,b'], 'createRecord'],
		[['record', 'update', 'r', '--name', 'x', '--opt-fields', 'a,b'], 'updateRecord'],
		[['record', 'stories', 'create', 'r', '--text', 'hi', '--opt-fields', 'a,b'], 'createRecordStory'],
	])('cli %j passes optFields', async (args, method) => {
		const { api, fns } = stubApi()
		await runCli(recordCommand(api), args)
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})

	it.each([
		['asana_record_create', 'createRecord', { table_gid: 't', name: 'n' }],
		['asana_record_update', 'updateRecord', { record_gid: 'r', name: 'x' }],
		['asana_record_story_create', 'createRecordStory', { record_gid: 'r', text: 'hi' }],
	])('mcp %s passes optFields', async (tool, method, params) => {
		const { api, fns } = stubApi()
		const server = mcpServer()
		registerRecordTools(server as never, api)
		await server.handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		expect(lastArg(fns[method] as never)).toEqual(opts)
	})
})

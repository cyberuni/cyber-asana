import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tagCommand } from './cli.js'
import { createAsanaTagGateway } from './gateway.js'
import { registerTagTools } from './mcp.js'

// `opt_fields` on the write operations: the gateway sends it to the SDK, and the CLI flag and MCP field reach the api.

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('tags write opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.TagsApi.prototype, 'createTagForWorkspace')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaTagGateway({} as Asana.ApiClient)

		await gateway.createTag('ws1', 'Urgent', {}, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Urgent' } }, 'ws1', { opt_fields: 'gid,name' }])
	})

	it('tags create --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createTag: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(tagCommand(api as never))
			.parseAsync(
				['node', 'test', ...['tag', 'create', 'Urgent', '--workspace-gid', 'ws1', '--opt-fields', 'gid,name']],
				{ from: 'node' },
			)

		expect(api.createTag).toHaveBeenCalledWith(...['ws1', 'Urgent', expect.anything(), { optFields: 'gid,name' }])
	})

	it('asana_tag_create opt_fields reaches the api method', async () => {
		const api = { createTag: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerTagTools(server as never, api as never)

		await server.handlers.get('asana_tag_create')?.({ workspace_gid: 'ws1', name: 'Urgent', opt_fields: 'gid,name' })

		expect(api.createTag).toHaveBeenCalledWith(...['ws1', 'Urgent', expect.anything(), { optFields: 'gid,name' }])
	})

	it('gateway update sends opt_fields to the SDK', async () => {
		const spy = vi.spyOn(Asana.TagsApi.prototype, 'updateTag').mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaTagGateway({} as Asana.ApiClient)

		await gateway.updateTag('t1', { name: 'Critical' }, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Critical' } }, 't1', { opt_fields: 'gid,name' }])
	})

	it('tags update --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updateTag: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(tagCommand(api as never))
			.parseAsync(['node', 'test', ...['tag', 'update', 't1', '--name', 'Critical', '--opt-fields', 'gid,name']], {
				from: 'node',
			})

		expect(api.updateTag).toHaveBeenCalledWith(...['t1', { name: 'Critical' }, { optFields: 'gid,name' }])
	})

	it('asana_tag_update opt_fields reaches the api method', async () => {
		const api = { updateTag: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerTagTools(server as never, api as never)

		await server.handlers.get('asana_tag_update')?.({ tag_gid: 't1', name: 'Critical', opt_fields: 'gid,name' })

		expect(api.updateTag).toHaveBeenCalledWith(...['t1', { name: 'Critical' }, { optFields: 'gid,name' }])
	})
})

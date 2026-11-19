import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sectionCommand } from './cli.js'
import { createAsanaSectionGateway } from './gateway.js'
import { registerSectionTools } from './mcp.js'

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

describe('sections write opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.SectionsApi.prototype, 'createSectionForProject')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaSectionGateway({} as Asana.ApiClient)

		await gateway.createSection('p1', 'Review', undefined, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...['p1', { body: { data: { name: 'Review' } }, opt_fields: 'gid,name' }])
	})

	it('sections create --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createSection: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(sectionCommand(api as never))
			.parseAsync(
				['node', 'test', ...['section', 'create', 'Review', '--project-gid', 'p1', '--opt-fields', 'gid,name']],
				{ from: 'node' },
			)

		expect(api.createSection).toHaveBeenCalledWith(...['p1', 'Review', expect.anything(), { optFields: 'gid,name' }])
	})

	it('asana_section_create opt_fields reaches the api method', async () => {
		const api = { createSection: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerSectionTools(server as never, api as never)

		await server.handlers.get('asana_section_create')?.({ project_gid: 'p1', name: 'Review', opt_fields: 'gid,name' })

		expect(api.createSection).toHaveBeenCalledWith(...['p1', 'Review', expect.anything(), { optFields: 'gid,name' }])
	})

	it('gateway update sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.SectionsApi.prototype, 'updateSection')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaSectionGateway({} as Asana.ApiClient)

		await gateway.updateSection('s1', 'Done', { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...['s1', { body: { data: { name: 'Done' } }, opt_fields: 'gid,name' }])
	})

	it('sections update --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updateSection: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(sectionCommand(api as never))
			.parseAsync(['node', 'test', ...['section', 'update', 's1', '--name', 'Done', '--opt-fields', 'gid,name']], {
				from: 'node',
			})

		expect(api.updateSection).toHaveBeenCalledWith(...['s1', 'Done', { optFields: 'gid,name' }])
	})

	it('asana_section_update opt_fields reaches the api method', async () => {
		const api = { updateSection: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerSectionTools(server as never, api as never)

		await server.handlers.get('asana_section_update')?.({ section_gid: 's1', name: 'Done', opt_fields: 'gid,name' })

		expect(api.updateSection).toHaveBeenCalledWith(...['s1', 'Done', { optFields: 'gid,name' }])
	})
})

import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectCommand } from './cli.js'
import { createAsanaProjectGateway } from './gateway.js'
import { registerProjectTools } from './mcp.js'

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

describe('projects write opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.ProjectsApi.prototype, 'createProject')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaProjectGateway({} as Asana.ApiClient)

		await gateway.createProject('ws1', 'Launch', undefined, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Launch', workspace: 'ws1' } }, { opt_fields: 'gid,name' }])
	})

	it('projects create --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createProject: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(projectCommand(api as never))
			.parseAsync(
				['node', 'test', ...['project', 'create', 'Launch', '--workspace-gid', 'ws1', '--opt-fields', 'gid,name']],
				{ from: 'node' },
			)

		expect(api.createProject).toHaveBeenCalledWith(...['ws1', 'Launch', expect.anything(), { optFields: 'gid,name' }])
	})

	it('asana_project_create opt_fields reaches the api method', async () => {
		const api = { createProject: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerProjectTools(server as never, api as never)

		await server.handlers.get('asana_project_create')?.({
			workspace_gid: 'ws1',
			name: 'Launch',
			opt_fields: 'gid,name',
		})

		expect(api.createProject).toHaveBeenCalledWith(...['ws1', 'Launch', expect.anything(), { optFields: 'gid,name' }])
	})

	it('gateway update sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.ProjectsApi.prototype, 'updateProject')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaProjectGateway({} as Asana.ApiClient)

		await gateway.updateProject('p1', { name: 'Renamed' }, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Renamed' } }, 'p1', { opt_fields: 'gid,name' }])
	})

	it('projects update --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updateProject: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(projectCommand(api as never))
			.parseAsync(['node', 'test', ...['project', 'update', 'p1', '--name', 'Renamed', '--opt-fields', 'gid,name']], {
				from: 'node',
			})

		expect(api.updateProject).toHaveBeenCalledWith(...['p1', { name: 'Renamed' }, { optFields: 'gid,name' }])
	})

	it('asana_project_update opt_fields reaches the api method', async () => {
		const api = { updateProject: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerProjectTools(server as never, api as never)

		await server.handlers.get('asana_project_update')?.({ project_gid: 'p1', name: 'Renamed', opt_fields: 'gid,name' })

		expect(api.updateProject).toHaveBeenCalledWith(...['p1', { name: 'Renamed' }, { optFields: 'gid,name' }])
	})
})

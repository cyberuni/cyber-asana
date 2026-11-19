import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectBriefCommand } from './cli.js'
import { createAsanaProjectBriefGateway } from './gateway.js'
import { registerProjectBriefTools } from './mcp.js'

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

describe('project-briefs write opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'createProjectBrief')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaProjectBriefGateway({} as Asana.ApiClient)

		await gateway.createProjectBrief('p1', { title: 'Charter' }, { optFields: 'gid,title' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { title: 'Charter' } }, 'p1', { opt_fields: 'gid,title' }])
	})

	it('project-briefs create --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createProjectBrief: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(projectBriefCommand(api as never))
			.parseAsync(
				[
					'node',
					'test',
					...['project-brief', 'create', '--project-gid', 'p1', '--title', 'Charter', '--opt-fields', 'gid,title'],
				],
				{ from: 'node' },
			)

		expect(api.createProjectBrief).toHaveBeenCalledWith(...['p1', { title: 'Charter' }, { optFields: 'gid,title' }])
	})

	it('asana_project_brief_create opt_fields reaches the api method', async () => {
		const api = { createProjectBrief: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerProjectBriefTools(server as never, api as never)

		await server.handlers.get('asana_project_brief_create')?.({
			project_gid: 'p1',
			title: 'Charter',
			opt_fields: 'gid,title',
		})

		expect(api.createProjectBrief).toHaveBeenCalledWith(...['p1', { title: 'Charter' }, { optFields: 'gid,title' }])
	})

	it('gateway update sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'updateProjectBrief')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaProjectBriefGateway({} as Asana.ApiClient)

		await gateway.updateProjectBrief('b1', { title: 'New' }, { optFields: 'gid,title' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { title: 'New' } }, 'b1', { opt_fields: 'gid,title' }])
	})

	it('project-briefs update --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updateProjectBrief: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(projectBriefCommand(api as never))
			.parseAsync(
				['node', 'test', ...['project-brief', 'update', 'b1', '--title', 'New', '--opt-fields', 'gid,title']],
				{ from: 'node' },
			)

		expect(api.updateProjectBrief).toHaveBeenCalledWith(...['b1', { title: 'New' }, { optFields: 'gid,title' }])
	})

	it('asana_project_brief_update opt_fields reaches the api method', async () => {
		const api = { updateProjectBrief: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerProjectBriefTools(server as never, api as never)

		await server.handlers.get('asana_project_brief_update')?.({
			project_brief_gid: 'b1',
			title: 'New',
			opt_fields: 'gid,title',
		})

		expect(api.updateProjectBrief).toHaveBeenCalledWith(...['b1', { title: 'New' }, { optFields: 'gid,title' }])
	})
})

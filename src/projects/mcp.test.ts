import { afterEach, describe, expect, it, vi } from 'vitest'

const searchProjectsMock = vi.fn()
const getProjectTaskCountsMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		searchProjects: searchProjectsMock,
		getProjectTaskCounts: getProjectTaskCountsMock,
	}
})

const { registerProjectTools } = await import('./mcp.js')

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

describe('projects/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('registers asana_project_counts and forwards params', async () => {
		getProjectTaskCountsMock.mockResolvedValue({ num_tasks: 12, num_completed_tasks: 7 })
		const server = createServer()
		registerProjectTools(server as any)

		const result = await server.handlers.get('asana_project_counts')?.({
			project_gid: '123',
			opt_fields: 'num_tasks,num_completed_tasks',
		})

		expect(getProjectTaskCountsMock).toHaveBeenCalledWith('123', {
			optFields: 'num_tasks,num_completed_tasks',
		})
		expect(result).toEqual({
			content: [{ type: 'text', text: JSON.stringify({ num_tasks: 12, num_completed_tasks: 7 }) }],
		})
	})

	it('asana_project_search forwards project search params to searchProjects', async () => {
		searchProjectsMock.mockResolvedValue([{ gid: '1', name: 'Launch Roadmap' }])
		const server = createServer()
		registerProjectTools(server as any)

		await server.handlers.get('asana_project_search')?.({
			workspace_gid: 'ws1',
			text: 'launch',
			completed: false,
			teams_any: 't1,t2',
			owner_any: 'me',
			members_any: 'u1',
			members_not: 'u2',
			portfolios_any: 'p1',
			created_on_after: '2026-04-01',
			sort_by: 'modified_at',
			sort_ascending: true,
			opt_fields: 'gid,name',
		})

		expect(searchProjectsMock).toHaveBeenCalledWith('ws1', {
			text: 'launch',
			completed: false,
			teamsAny: 't1,t2',
			ownerAny: 'me',
			membersAny: 'u1',
			membersNot: 'u2',
			portfoliosAny: 'p1',
			createdOnAfter: '2026-04-01',
			sortBy: 'modified_at',
			sortAscending: true,
			optFields: 'gid,name',
		})
	})
})

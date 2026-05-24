import { afterEach, describe, expect, it, vi } from 'vitest'

const searchProjectsMock = vi.fn()
const getProjectTaskCountsMock = vi.fn()
const createProjectMock = vi.fn()
const updateProjectMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		searchProjects: searchProjectsMock,
		getProjectTaskCounts: getProjectTaskCountsMock,
		createProject: createProjectMock,
		updateProject: updateProjectMock,
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

	it('asana_project_create forwards richer project write params', async () => {
		createProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const server = createServer()
		registerProjectTools(server as any)

		await server.handlers.get('asana_project_create')?.({
			workspace_gid: 'ws1',
			name: 'Launch',
			html_notes: '<body>Brief</body>',
			privacy_setting: 'private',
			default_view: 'board',
			due_on: '2026-06-10',
			start_on: '2026-06-01',
		})

		expect(createProjectMock).toHaveBeenCalledWith('ws1', 'Launch', {
			html_notes: '<body>Brief</body>',
			privacy_setting: 'private',
			default_view: 'board',
			due_on: '2026-06-10',
			start_on: '2026-06-01',
		})
	})

	it('asana_project_update maps clear start flag to start_on null', async () => {
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const server = createServer()
		registerProjectTools(server as any)

		await server.handlers.get('asana_project_update')?.({
			project_gid: '123',
			due_on: '2026-06-10',
			clear_start_on: true,
		})

		expect(updateProjectMock).toHaveBeenCalledWith('123', {
			due_on: '2026-06-10',
			start_on: null,
		})
	})
})

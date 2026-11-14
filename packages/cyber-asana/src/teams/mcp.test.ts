import { afterEach, describe, expect, it, vi } from 'vitest'

const listTeamsMock = vi.fn()
const getTeamMock = vi.fn()
const listTeamMembersMock = vi.fn()
const listTeamProjectsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		listTeams: listTeamsMock,
		getTeam: getTeamMock,
		listTeamMembers: listTeamMembersMock,
		listTeamProjects: listTeamProjectsMock,
	}
})

const { registerTeamTools } = await import('./mcp.js')

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

describe('teams/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_team_list forwards workspace gid and pagination options', async () => {
		listTeamsMock.mockResolvedValue({ data: [{ gid: 'team1', name: 'Engineering' }], next_page: null, limit: 100 })
		const server = createServer()
		registerTeamTools(server as any)

		await server.handlers.get('asana_team_list')?.({
			workspace_gid: 'ws1',
			limit: 50,
			opt_fields: 'gid,name',
		})

		expect(listTeamsMock).toHaveBeenCalledWith('ws1', {
			limit: 50,
			optFields: 'gid,name',
		})
	})

	it('asana_team_get forwards team gid', async () => {
		getTeamMock.mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const server = createServer()
		registerTeamTools(server as any)

		await server.handlers.get('asana_team_get')?.({ team_gid: 'team1' })

		expect(getTeamMock).toHaveBeenCalledWith('team1', undefined)
	})

	it('team tools can use injected dependencies', async () => {
		const injectedGetTeam = vi.fn().mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const server = createServer()
		registerTeamTools(server as any, {
			listTeams: vi.fn(),
			getTeam: injectedGetTeam,
			listTeamMembers: vi.fn(),
			listTeamProjects: vi.fn(),
		})

		await server.handlers.get('asana_team_get')?.({ team_gid: 'team1' })

		expect(injectedGetTeam).toHaveBeenCalledWith('team1', undefined)
	})

	it('asana_team_members forwards the team gid and pagination options', async () => {
		listTeamMembersMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const server = createServer()
		registerTeamTools(server as any)

		await server.handlers.get('asana_team_members')?.({ team_gid: 'team1', limit: 5, fetch_all: true })

		expect(listTeamMembersMock).toHaveBeenCalledWith('team1', { limit: 5, fetchAll: true })
	})

	it('asana_team_projects forwards the team gid, archived, and pagination options', async () => {
		listTeamProjectsMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const server = createServer()
		registerTeamTools(server as any)

		await server.handlers.get('asana_team_projects')?.({ team_gid: 'team1', archived: false, offset: 'abc' })

		expect(listTeamProjectsMock).toHaveBeenCalledWith('team1', { offset: 'abc', archived: false })
	})
})

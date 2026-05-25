import { afterEach, describe, expect, it, vi } from 'vitest'

const listTeamsMock = vi.fn()
const getTeamMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listTeams: listTeamsMock,
		getTeam: getTeamMock,
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

		expect(getTeamMock).toHaveBeenCalledWith('team1')
	})

	it('team tools can use injected dependencies', async () => {
		const injectedGetTeam = vi.fn().mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const server = createServer()
		registerTeamTools(server as any, {
			listTeams: vi.fn(),
			getTeam: injectedGetTeam,
		})

		await server.handlers.get('asana_team_get')?.({ team_gid: 'team1' })

		expect(injectedGetTeam).toHaveBeenCalledWith('team1')
	})
})

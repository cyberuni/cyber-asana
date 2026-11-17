import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTeamApi } from './api.js'
import { teamCommand } from './cli.js'
import { createAsanaTeamGateway } from './gateway.js'
import { registerTeamTools } from './mcp.js'

describe('teams for a user', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway reads the user’s teams within an organization', async () => {
		const spy = vi
			.spyOn(Asana.TeamsApi.prototype, 'getTeamsForUser')
			.mockResolvedValue({ data: [{ gid: 't1' }] } as never)

		await createAsanaTeamGateway({} as Asana.ApiClient).listTeamsForUser('u1', 'w1', { limit: 5 })

		expect(spy).toHaveBeenCalledWith('u1', 'w1', { limit: 5 })
	})

	it('api forwards to the gateway', async () => {
		const gateway = { listTeamsForUser: vi.fn().mockResolvedValue([]) }

		await createTeamApi(gateway as never).listTeamsForUser('u1', 'w1', { limit: 1 })

		expect(gateway.listTeamsForUser).toHaveBeenCalledWith('u1', 'w1', { limit: 1 })
	})

	it('team for-user lists with a minimal field set and names the empty state', async () => {
		const listTeamsForUser = vi.fn().mockResolvedValue([])
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(teamCommand({ listTeamsForUser } as never))

		await program.parseAsync(['node', 't', 'team', 'for-user', 'u1', '--workspace-gid', 'w1'], { from: 'node' })

		expect(listTeamsForUser).toHaveBeenCalledWith('u1', 'w1', expect.objectContaining({ optFields: 'gid,name' }))
		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('0 teams found')
	})

	it('MCP asana_team_list_for_user forwards to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = { listTeamsForUser: vi.fn().mockResolvedValue([{ gid: 't1' }]) }
		registerTeamTools(server as never, api as never)

		await handlers.get('asana_team_list_for_user')?.({ user_gid: 'u1', workspace_gid: 'w1', limit: 5 })

		expect(api.listTeamsForUser).toHaveBeenCalledWith('u1', 'w1', expect.objectContaining({ limit: 5 }))
	})
})

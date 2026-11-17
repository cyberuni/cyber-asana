import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'

describe('goal followers', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway posts the follower GIDs to addFollowers and removeFollowers', async () => {
		const add = vi.spyOn(Asana.GoalsApi.prototype, 'addFollowers').mockResolvedValue({ data: { gid: 'g1' } } as never)
		const remove = vi
			.spyOn(Asana.GoalsApi.prototype, 'removeFollowers')
			.mockResolvedValue({ data: { gid: 'g1' } } as never)
		const gateway = createAsanaGoalGateway({} as Asana.ApiClient)

		expect(await gateway.addGoalFollowers('g1', ['u1', 'u2'])).toEqual({ gid: 'g1' })
		await gateway.removeGoalFollowers('g1', ['u1'])

		expect(add).toHaveBeenCalledWith({ data: { followers: ['u1', 'u2'] } }, 'g1', {})
		expect(remove).toHaveBeenCalledWith({ data: { followers: ['u1'] } }, 'g1', {})
	})

	it('api forwards both calls', async () => {
		const gateway = {
			addGoalFollowers: vi.fn().mockResolvedValue({ gid: 'g1' }),
			removeGoalFollowers: vi.fn().mockResolvedValue({ gid: 'g1' }),
		}
		const api = createGoalApi(gateway as never)

		await api.addGoalFollowers('g1', ['u1'])
		await api.removeGoalFollowers('g1', ['u1'])

		expect(gateway.addGoalFollowers).toHaveBeenCalledWith('g1', ['u1'])
		expect(gateway.removeGoalFollowers).toHaveBeenCalledWith('g1', ['u1'])
	})

	it('goal follower add and remove', async () => {
		const addGoalFollowers = vi.fn().mockResolvedValue({ gid: 'g1' })
		const removeGoalFollowers = vi.fn().mockResolvedValue({ gid: 'g1' })
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(goalCommand({ addGoalFollowers, removeGoalFollowers } as never))

		await program.parseAsync(['node', 't', 'goal', 'follower', 'add', 'g1', 'u1', 'u2'], { from: 'node' })
		await program.parseAsync(['node', 't', 'goal', 'follower', 'remove', 'g1', 'u1'], { from: 'node' })

		expect(addGoalFollowers).toHaveBeenCalledWith('g1', ['u1', 'u2'])
		expect(removeGoalFollowers).toHaveBeenCalledWith('g1', ['u1'])
		const logged = log.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('Added 2 follower(s) to goal g1')
		expect(logged).toContain('Removed 1 follower(s) from goal g1')
	})

	it('MCP tools forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = {
			addGoalFollowers: vi.fn().mockResolvedValue({ gid: 'g1' }),
			removeGoalFollowers: vi.fn().mockResolvedValue({ gid: 'g1' }),
		}
		registerGoalTools(server as never, api as never)

		await handlers.get('asana_goal_follower_add')?.({ goal_gid: 'g1', follower_gids: ['u1'] })
		await handlers.get('asana_goal_follower_remove')?.({ goal_gid: 'g1', follower_gids: ['u1', 'u2'] })

		expect(api.addGoalFollowers).toHaveBeenCalledWith('g1', ['u1'])
		expect(api.removeGoalFollowers).toHaveBeenCalledWith('g1', ['u1', 'u2'])
	})
})

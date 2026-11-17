import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'

describe('goal supporting relationships', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway posts the supporting resource under the goal', async () => {
		const add = vi
			.spyOn(Asana.GoalRelationshipsApi.prototype, 'addSupportingRelationship')
			.mockResolvedValue({ data: { gid: 'r1' } } as never)
		const remove = vi
			.spyOn(Asana.GoalRelationshipsApi.prototype, 'removeSupportingRelationship')
			.mockResolvedValue({ data: {} } as never)
		const gateway = createAsanaGoalGateway({} as Asana.ApiClient)

		const rel = await gateway.addSupportingRelationship('g1', 'p1', { contributionWeight: 0.5 })
		await gateway.removeSupportingRelationship('g1', 'p1')

		expect(rel).toEqual({ gid: 'r1' })
		expect(add).toHaveBeenCalledWith({ data: { supporting_resource: 'p1', contribution_weight: 0.5 } }, 'g1', {})
		expect(remove).toHaveBeenCalledWith({ data: { supporting_resource: 'p1' } }, 'g1')
	})

	it('api forwards both calls', async () => {
		const gateway = {
			addSupportingRelationship: vi.fn().mockResolvedValue({ gid: 'r1' }),
			removeSupportingRelationship: vi.fn().mockResolvedValue(undefined),
		}
		const api = createGoalApi(gateway as never)

		await api.addSupportingRelationship('g1', 'p1', { insertBefore: 'x' })
		await api.removeSupportingRelationship('g1', 'p1')

		expect(gateway.addSupportingRelationship).toHaveBeenCalledWith('g1', 'p1', { insertBefore: 'x' })
		expect(gateway.removeSupportingRelationship).toHaveBeenCalledWith('g1', 'p1')
	})

	it('goal supporting add and remove', async () => {
		const addSupportingRelationship = vi.fn().mockResolvedValue({ gid: 'r1' })
		const removeSupportingRelationship = vi.fn().mockResolvedValue(undefined)
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(
			goalCommand({ addSupportingRelationship, removeSupportingRelationship } as never),
		)

		await program.parseAsync(['node', 't', 'goal', 'supporting', 'add', 'g1', 'p1', '--weight', '0.25'], {
			from: 'node',
		})
		await program.parseAsync(['node', 't', 'goal', 'supporting', 'remove', 'g1', 'p1'], { from: 'node' })

		expect(addSupportingRelationship).toHaveBeenCalledWith('g1', 'p1', { contributionWeight: 0.25 })
		expect(removeSupportingRelationship).toHaveBeenCalledWith('g1', 'p1')
		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Removed supporting resource p1 from goal g1')
	})

	it('MCP tools forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = {
			addSupportingRelationship: vi.fn().mockResolvedValue({ gid: 'r1' }),
			removeSupportingRelationship: vi.fn().mockResolvedValue(undefined),
		}
		registerGoalTools(server as never, api as never)

		const added = await handlers.get('asana_goal_supporting_add')?.({
			goal_gid: 'g1',
			supporting_resource_gid: 'p1',
			contribution_weight: 1,
		})
		await handlers.get('asana_goal_supporting_remove')?.({ goal_gid: 'g1', supporting_resource_gid: 'p1' })

		expect(api.addSupportingRelationship).toHaveBeenCalledWith('g1', 'p1', { contributionWeight: 1 })
		expect(api.removeSupportingRelationship).toHaveBeenCalledWith('g1', 'p1')
		expect(JSON.parse(added.content[0].text)).toEqual({ gid: 'r1' })
	})
})

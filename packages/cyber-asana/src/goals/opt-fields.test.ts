import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'

const fields = { opt_fields: 'name,gid' }

describe('goal writes accept opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends opt_fields on every write that returns the resource', async () => {
		const ok = { data: { gid: 'g1' } } as never
		const createGoal = vi.spyOn(Asana.GoalsApi.prototype, 'createGoal').mockResolvedValue(ok)
		const updateGoal = vi.spyOn(Asana.GoalsApi.prototype, 'updateGoal').mockResolvedValue(ok)
		const createGoalMetric = vi.spyOn(Asana.GoalsApi.prototype, 'createGoalMetric').mockResolvedValue(ok)
		const updateGoalMetric = vi.spyOn(Asana.GoalsApi.prototype, 'updateGoalMetric').mockResolvedValue(ok)
		const addSupporting = vi
			.spyOn(Asana.GoalRelationshipsApi.prototype, 'addSupportingRelationship')
			.mockResolvedValue(ok)
		const gateway = createAsanaGoalGateway({} as Asana.ApiClient)
		const read = { optFields: 'name,gid' }

		await gateway.createGoal('ws1', 'G', { due_on: '2026-01-01' }, read)
		await gateway.updateGoal('g1', { name: 'N' }, read)
		await gateway.setGoalMetric('g1', { unit: 'none' }, read)
		await gateway.setGoalMetricCurrentValue('g1', 2, read)
		await gateway.addSupportingRelationship('g1', 's1', undefined, read)

		expect(createGoal.mock.calls[0]?.[1]).toEqual(fields)
		expect(updateGoal.mock.calls[0]?.[2]).toEqual(fields)
		expect(createGoalMetric.mock.calls[0]?.[2]).toEqual(fields)
		expect(updateGoalMetric.mock.calls[0]?.[2]).toEqual(fields)
		expect(addSupporting.mock.calls[0]?.[2]).toEqual(fields)
	})

	it('CLI --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = {
			createGoal: vi.fn().mockResolvedValue({ gid: 'g1' }),
			updateGoal: vi.fn().mockResolvedValue({ gid: 'g1' }),
			setGoalMetric: vi.fn().mockResolvedValue({}),
			setGoalMetricCurrentValue: vi.fn().mockResolvedValue({}),
			addSupportingRelationship: vi.fn().mockResolvedValue({}),
		}
		const run = (...args: string[]) =>
			new Command()
				.addCommand(goalCommand(api as never))
				.parseAsync(['node', 'test', 'goal', ...args], { from: 'node' })
		const of = ['--opt-fields', 'a,b']

		await run('create', 'G', '--workspace-gid', 'ws1', ...of)
		await run('update', 'g1', '--name', 'N', ...of)
		await run('metric', 'set', 'g1', ...of)
		await run('metric', 'set-current', 'g1', '3', ...of)
		await run('supporting', 'add', 'g1', 's1', ...of)

		const read = { optFields: 'a,b' }
		expect(api.createGoal).toHaveBeenCalledWith('ws1', 'G', expect.anything(), read)
		expect(api.updateGoal).toHaveBeenCalledWith('g1', expect.anything(), read)
		expect(api.setGoalMetric).toHaveBeenCalledWith('g1', expect.anything(), read)
		expect(api.setGoalMetricCurrentValue).toHaveBeenCalledWith('g1', 3, read)
		expect(api.addSupportingRelationship).toHaveBeenCalledWith('g1', 's1', expect.anything(), read)
	})

	it('MCP opt_fields reaches the api method', async () => {
		const handlers = new Map<string, (p: never) => Promise<unknown>>()
		const server = { tool: (name: string, _d: string, _s: unknown, h: never) => handlers.set(name, h) }
		const api = {
			createGoal: vi.fn().mockResolvedValue({}),
			updateGoal: vi.fn().mockResolvedValue({}),
			setGoalMetric: vi.fn().mockResolvedValue({}),
			setGoalMetricCurrentValue: vi.fn().mockResolvedValue({}),
			addSupportingRelationship: vi.fn().mockResolvedValue({}),
		}
		registerGoalTools(server as never, api as never)
		const call = (name: string, p: object) => handlers.get(name)?.({ ...p, opt_fields: 'a,b' } as never)

		await call('asana_goal_create', { workspace_gid: 'ws1', name: 'G' })
		await call('asana_goal_update', { goal_gid: 'g1' })
		await call('asana_goal_metric_set', { goal_gid: 'g1' })
		await call('asana_goal_metric_set_current_value', { goal_gid: 'g1', current_number_value: 3 })
		await call('asana_goal_supporting_add', { goal_gid: 'g1', supporting_resource_gid: 's1' })

		const read = { optFields: 'a,b' }
		expect(api.createGoal).toHaveBeenCalledWith('ws1', 'G', expect.anything(), read)
		expect(api.updateGoal).toHaveBeenCalledWith('g1', expect.anything(), read)
		expect(api.setGoalMetric).toHaveBeenCalledWith('g1', expect.anything(), read)
		expect(api.setGoalMetricCurrentValue).toHaveBeenCalledWith('g1', 3, read)
		expect(api.addSupportingRelationship).toHaveBeenCalledWith('g1', 's1', expect.anything(), read)
	})
})

import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'

const metric = { gid: 'm1', unit: 'number', target_number_value: 10 }

describe('goal metrics', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends the metric fields as the request body, snake_cased and only when given', async () => {
		const createGoalMetric = vi.spyOn(Asana.GoalsApi.prototype, 'createGoalMetric').mockResolvedValue({ data: metric })
		const updateGoalMetric = vi.spyOn(Asana.GoalsApi.prototype, 'updateGoalMetric').mockResolvedValue({ data: metric })
		const gateway = createAsanaGoalGateway({} as never)

		await gateway.setGoalMetric('g1', { unit: 'currency', currencyCode: 'USD', targetNumberValue: 10, precision: 2 })
		await gateway.setGoalMetricCurrentValue('g1', 4)

		expect(createGoalMetric).toHaveBeenCalledWith(
			{ data: { unit: 'currency', currency_code: 'USD', target_number_value: 10, precision: 2 } },
			'g1',
			{},
		)
		expect(updateGoalMetric).toHaveBeenCalledWith({ data: { current_number_value: 4 } }, 'g1', {})
	})

	it('api passes both writes through to the gateway', async () => {
		const setGoalMetric = vi.fn().mockResolvedValue(metric)
		const setGoalMetricCurrentValue = vi.fn().mockResolvedValue(metric)
		const api = createGoalApi({ setGoalMetric, setGoalMetricCurrentValue } as never)

		expect(await api.setGoalMetric('g1', { unit: 'none' })).toBe(metric)
		expect(await api.setGoalMetricCurrentValue('g1', 3)).toBe(metric)
		expect(setGoalMetric).toHaveBeenCalledWith('g1', { unit: 'none' }, undefined)
		expect(setGoalMetricCurrentValue).toHaveBeenCalledWith('g1', 3, undefined)
	})

	it('goal metric set and set-current forward typed options', async () => {
		const setGoalMetric = vi.fn().mockResolvedValue({ gid: 'g1', metric })
		const setGoalMetricCurrentValue = vi.fn().mockResolvedValue({ gid: 'g1', metric })
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(goalCommand({ setGoalMetric, setGoalMetricCurrentValue } as never))

		await program.parseAsync(
			[
				'node',
				't',
				'goal',
				'metric',
				'set',
				'g1',
				'--unit',
				'percentage',
				'--initial',
				'0',
				'--target',
				'100',
				'--precision',
				'1',
			],
			{ from: 'node' },
		)
		await program.parseAsync(['node', 't', 'goal', 'metric', 'set-current', 'g1', '42.5'], { from: 'node' })

		expect(setGoalMetric).toHaveBeenCalledWith(
			'g1',
			{
				unit: 'percentage',
				initialNumberValue: 0,
				targetNumberValue: 100,
				precision: 1,
			},
			undefined,
		)
		expect(setGoalMetricCurrentValue).toHaveBeenCalledWith('g1', 42.5, undefined)
		expect(log).toHaveBeenCalled()
	})

	it('goal metric rejects a non-numeric value', async () => {
		const program = new Command().addCommand(goalCommand({ setGoalMetricCurrentValue: vi.fn() } as never))
		program.exitOverride()
		await expect(
			program.parseAsync(['node', 't', 'goal', 'metric', 'set-current', 'g1', 'abc'], { from: 'node' }),
		).rejects.toThrow(/number/i)
	})

	it('MCP tools forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const setGoalMetric = vi.fn().mockResolvedValue(metric)
		const setGoalMetricCurrentValue = vi.fn().mockResolvedValue(metric)
		registerGoalTools(server as never, { setGoalMetric, setGoalMetricCurrentValue } as never)

		await handlers.get('asana_goal_metric_set')?.({
			goal_gid: 'g1',
			unit: 'currency',
			currency_code: 'EUR',
			initial_number_value: 1,
			target_number_value: 5,
		})
		const res = await handlers.get('asana_goal_metric_set_current_value')?.({
			goal_gid: 'g1',
			current_number_value: 2,
		})

		expect(setGoalMetric).toHaveBeenCalledWith(
			'g1',
			{
				unit: 'currency',
				currencyCode: 'EUR',
				initialNumberValue: 1,
				targetNumberValue: 5,
			},
			undefined,
		)
		expect(setGoalMetricCurrentValue).toHaveBeenCalledWith('g1', 2, undefined)
		expect(JSON.parse(res.content[0].text)).toEqual(metric)
	})
})

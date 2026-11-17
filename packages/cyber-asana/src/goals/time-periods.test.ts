import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'

const period = { gid: 'tp1', display_name: 'Q1 2026', period: 'Q1', start_on: '2026-01-01', end_on: '2026-03-31' }

describe('goal time periods', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway reads one time period by GID', async () => {
		const get = vi.spyOn(Asana.TimePeriodsApi.prototype, 'getTimePeriod').mockResolvedValue({ data: period } as never)
		const gateway = createAsanaGoalGateway({} as Asana.ApiClient)

		expect(await gateway.getTimePeriod('tp1', { optFields: 'display_name' })).toEqual(period)
		expect(get).toHaveBeenCalledWith('tp1', { opt_fields: 'display_name' })
	})

	it('api forwards getTimePeriod', async () => {
		const gateway = { getTimePeriod: vi.fn().mockResolvedValue(period) }
		const api = createGoalApi(gateway as never)

		expect(await api.getTimePeriod('tp1')).toEqual(period)
		expect(gateway.getTimePeriod).toHaveBeenCalledWith('tp1', undefined)
	})

	it('CLI lists time periods with a minimal default schema and gets one', async () => {
		const listTimePeriods = vi.fn().mockResolvedValue({ data: [period], limit: 100 })
		const getTimePeriod = vi.fn().mockResolvedValue(period)
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(goalCommand({ listTimePeriods, getTimePeriod } as never))

		await program.parseAsync(['node', 't', 'goal', 'time-period', 'list', '--workspace-gid', 'ws1'], { from: 'node' })
		await program.parseAsync(['node', 't', 'goal', 'time-period', 'get', 'tp1'], { from: 'node' })

		expect(listTimePeriods).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ optFields: 'gid,display_name,start_on,end_on' }),
		)
		expect(getTimePeriod).toHaveBeenCalledWith('tp1', undefined)
		const logged = log.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('Q1 2026')
		expect(logged).toContain('2026-03-31')
	})

	it('CLI names an empty result', async () => {
		const listTimePeriods = vi.fn().mockResolvedValue({ data: [], limit: 100 })
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(goalCommand({ listTimePeriods } as never))

		await program.parseAsync(['node', 't', 'goal', 'time-period', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('0 time periods found')
	})

	it('MCP tools forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = {
			listTimePeriods: vi.fn().mockResolvedValue({ data: [period] }),
			getTimePeriod: vi.fn().mockResolvedValue(period),
		}
		registerGoalTools(server as never, api as never)

		await handlers.get('asana_time_period_list')?.({ workspace_gid: 'ws1', limit: 5 })
		await handlers.get('asana_time_period_get')?.({ time_period_gid: 'tp1' })

		expect(api.listTimePeriods).toHaveBeenCalledWith('ws1', expect.objectContaining({ limit: 5 }))
		expect(api.getTimePeriod).toHaveBeenCalledWith('tp1', undefined)
	})
})

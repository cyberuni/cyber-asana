import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'
import { goalCommand } from './cli.js'
import { createAsanaGoalGateway } from './gateway.js'
import { registerGoalTools } from './mcp.js'
import { buildGoalCreateFields, buildGoalUpdateFields } from './write-options.js'

const client = {} as Asana.ApiClient

function tools(api: unknown) {
	const handlers = new Map<string, (p: any) => Promise<any>>()
	const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
	registerGoalTools(server as never, api as never)
	return handlers
}

async function run(api: unknown, ...args: string[]) {
	vi.spyOn(console, 'log').mockImplementation(() => {})
	const program = new Command().exitOverride().addCommand(goalCommand(api as never))
	await program.parseAsync(['node', 't', 'goal', ...args], { from: 'node' })
}

describe('goal write fields', () => {
	it('create carries owner, team, workspace level, liked, time period and followers', () => {
		expect(
			buildGoalCreateFields({
				timePeriod: 'tp1',
				owner: 'u1',
				team: 't1',
				isWorkspaceLevel: false,
				liked: true,
				followerInput: 'me, a@b.co',
			}),
		).toEqual({
			time_period: 'tp1',
			owner: 'u1',
			team: 't1',
			is_workspace_level: false,
			liked: true,
			followers: ['me', 'a@b.co'],
		})
	})

	it('create takes follower gids as an array', () => {
		expect(buildGoalCreateFields({ followerGids: ['1', '2'] })).toEqual({ followers: ['1', '2'] })
	})

	it('update carries the new fields, merging custom field sources', () => {
		expect(
			buildGoalUpdateFields({
				timePeriod: 'tp1',
				owner: 'u1',
				team: 't1',
				isWorkspaceLevel: true,
				liked: false,
				status: 'green',
				customFieldsJson: '{"1":"a"}',
				customFieldEntries: ['2=b'],
				htmlCustomFieldsJson: '{"3":"<body>x</body>"}',
				htmlCustomFieldEntries: ['4=<body>y</body>'],
			}),
		).toEqual({
			time_period: 'tp1',
			owner: 'u1',
			team: 't1',
			is_workspace_level: true,
			liked: false,
			status: 'green',
			custom_fields: { '1': 'a', '2': 'b' },
			html_custom_fields: { '3': '<body>x</body>', '4': '<body>y</body>' },
		})
	})

	it('update rejects a status outside the enum', () => {
		expect(() => buildGoalUpdateFields({ status: 'blue' })).toThrow(
			'status must be one of: green, yellow, red, missed, achieved, partial, dropped; got "blue"',
		)
	})
})

describe('goal gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('sends the new create fields under Asana names', async () => {
		const create = vi.spyOn(Asana.GoalsApi.prototype, 'createGoal').mockResolvedValue({ data: {} } as never)
		await createAsanaGoalGateway(client).createGoal('ws1', 'G', {
			owner: 'u1',
			team: 't1',
			is_workspace_level: true,
			liked: true,
			followers: ['me'],
			time_period: 'tp1',
		})
		expect(create).toHaveBeenCalledWith(
			{
				data: {
					name: 'G',
					workspace: 'ws1',
					owner: 'u1',
					team: 't1',
					is_workspace_level: true,
					liked: true,
					followers: ['me'],
					time_period: 'tp1',
				},
			},
			{},
		)
	})

	it('sends the new update fields under Asana names', async () => {
		const update = vi.spyOn(Asana.GoalsApi.prototype, 'updateGoal').mockResolvedValue({ data: {} } as never)
		await createAsanaGoalGateway(client).updateGoal('g1', {
			status: 'red',
			custom_fields: { '1': 'a' },
			html_custom_fields: { '2': 'x' },
			time_period: 'tp1',
		})
		expect(update).toHaveBeenCalledWith(
			{ data: { status: 'red', custom_fields: { '1': 'a' }, html_custom_fields: { '2': 'x' }, time_period: 'tp1' } },
			'g1',
			{},
		)
	})

	it('sends is_custom_weight on a metric', async () => {
		const create = vi.spyOn(Asana.GoalsApi.prototype, 'createGoalMetric').mockResolvedValue({ data: {} } as never)
		await createAsanaGoalGateway(client).setGoalMetric('g1', { isCustomWeight: true })
		expect(create).toHaveBeenCalledWith({ data: { is_custom_weight: true } }, 'g1', {})
	})

	it('sends the list filters, joining time periods with commas', async () => {
		const get = vi.spyOn(Asana.GoalsApi.prototype, 'getGoals').mockResolvedValue({ data: [] } as never)
		await createAsanaGoalGateway(client).listGoals('ws1', {
			portfolio: 'pf',
			project: 'pr',
			task: 'tk',
			team: 'tm',
			isWorkspaceLevel: true,
			timePeriods: ['a', 'b'],
			limit: 5,
		})
		expect(get).toHaveBeenCalledWith({
			workspace: 'ws1',
			portfolio: 'pf',
			project: 'pr',
			task: 'tk',
			team: 'tm',
			is_workspace_level: true,
			time_periods: 'a,b',
			limit: 5,
		})
	})

	it('omits workspace when listing by another scope', async () => {
		const get = vi.spyOn(Asana.GoalsApi.prototype, 'getGoals').mockResolvedValue({ data: [] } as never)
		await createAsanaGoalGateway(client).listGoals(undefined, { team: 'tm' })
		expect(get).toHaveBeenCalledWith({ team: 'tm', limit: 100 })
	})

	it('sends start_on and end_on when listing time periods', async () => {
		const get = vi.spyOn(Asana.TimePeriodsApi.prototype, 'getTimePeriods').mockResolvedValue({ data: [] } as never)
		await createAsanaGoalGateway(client).listTimePeriods('ws1', { startOn: '2026-01-01', endOn: '2026-12-31' })
		expect(get).toHaveBeenCalledWith('ws1', { limit: 100, start_on: '2026-01-01', end_on: '2026-12-31' })
	})
})

describe('goal api validation', () => {
	const gateway = { listGoals: vi.fn().mockResolvedValue([]), listTimePeriods: vi.fn().mockResolvedValue([]) }
	const api = createGoalApi(gateway as never)

	it('rejects is_workspace_level without a workspace before any request', () => {
		expect(() => api.listGoals(undefined, { team: 't1', isWorkspaceLevel: true })).toThrow(
			'is_workspace_level needs a workspace',
		)
		expect(gateway.listGoals).not.toHaveBeenCalled()
	})

	it('rejects a list with no scope', () => {
		expect(() => api.listGoals(undefined, { timePeriods: ['a'] })).toThrow(
			'list goals by a workspace, portfolio, project, task or team',
		)
	})

	it('rejects a malformed time period date', () => {
		expect(() => api.listTimePeriods('ws1', { startOn: '2026-1-1' })).toThrow('start_on must be a date (YYYY-MM-DD)')
		expect(() => api.listTimePeriods('ws1', { endOn: '2026-02-30' })).toThrow('end_on must be a date (YYYY-MM-DD)')
		expect(gateway.listTimePeriods).not.toHaveBeenCalled()
	})

	it('forwards a valid list', async () => {
		await api.listTimePeriods('ws1', { startOn: '2026-01-01' })
		expect(gateway.listTimePeriods).toHaveBeenCalledWith('ws1', { startOn: '2026-01-01' })
	})
})

describe('goal CLI', () => {
	afterEach(() => vi.restoreAllMocks())

	it('create passes the new flags', async () => {
		const createGoal = vi.fn().mockResolvedValue({ gid: 'g' })
		await run(
			{ createGoal },
			...['create', 'G', '--workspace-gid', 'ws1', '--time-period', 'tp1', '--owner', 'u1', '--team', 't1'],
			...['--workspace-level', '--liked', '--follower', 'me,a@b.co'],
		)
		expect(createGoal).toHaveBeenCalledWith(
			'ws1',
			'G',
			{
				time_period: 'tp1',
				owner: 'u1',
				team: 't1',
				is_workspace_level: true,
				liked: true,
				followers: ['me', 'a@b.co'],
			},
			undefined,
		)
	})

	it('create accepts the negated flags', async () => {
		const createGoal = vi.fn().mockResolvedValue({ gid: 'g' })
		await run({ createGoal }, 'create', 'G', '--workspace-gid', 'ws1', '--no-workspace-level', '--no-liked')
		expect(createGoal.mock.calls[0][2]).toEqual({ is_workspace_level: false, liked: false })
	})

	it('update passes the new flags', async () => {
		const updateGoal = vi.fn().mockResolvedValue({ gid: 'g' })
		await run(
			{ updateGoal },
			...['update', 'g1', '--time-period', 'tp1', '--owner', 'u1', '--team', 't1', '--no-workspace-level', '--liked'],
			...['--status', 'achieved', '--custom-fields-json', '{"1":"a"}', '--custom-field', '2=b'],
			...['--html-custom-fields-json', '{"3":"x"}', '--html-custom-field', '4=y'],
		)
		expect(updateGoal).toHaveBeenCalledWith(
			'g1',
			{
				time_period: 'tp1',
				owner: 'u1',
				team: 't1',
				is_workspace_level: false,
				liked: true,
				status: 'achieved',
				custom_fields: { '1': 'a', '2': 'b' },
				html_custom_fields: { '3': 'x', '4': 'y' },
			},
			undefined,
		)
	})

	it('metric set passes --custom-weight', async () => {
		const setGoalMetric = vi.fn().mockResolvedValue({})
		await run({ setGoalMetric }, 'metric', 'set', 'g1', '--custom-weight')
		expect(setGoalMetric).toHaveBeenCalledWith('g1', { isCustomWeight: true }, undefined)
		await run({ setGoalMetric }, 'metric', 'set', 'g1', '--no-custom-weight')
		expect(setGoalMetric).toHaveBeenLastCalledWith('g1', { isCustomWeight: false }, undefined)
	})

	it('list passes the filters and drops the workspace when another scope is given', async () => {
		const listGoals = vi.fn().mockResolvedValue([])
		await run(
			{ listGoals },
			...['list', '--portfolio', 'pf', '--project', 'pr', '--task', 'tk', '--team', 'tm'],
			...['--time-period', 'a', '--time-period', 'b,c'],
		)
		expect(listGoals).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({
				portfolio: 'pf',
				project: 'pr',
				task: 'tk',
				team: 'tm',
				timePeriods: ['a', 'b', 'c'],
			}),
		)
	})

	it('list passes --workspace-level with the workspace', async () => {
		const listGoals = vi.fn().mockResolvedValue([])
		await run({ listGoals }, 'list', '--workspace-gid', 'ws1', '--workspace-level')
		expect(listGoals).toHaveBeenCalledWith('ws1', expect.objectContaining({ isWorkspaceLevel: true }))
	})

	it('list with no scope still asks for a workspace', async () => {
		delete process.env.ASANA_WORKSPACE_GID
		await expect(run({ listGoals: vi.fn() }, 'list')).rejects.toThrow('Workspace GID is required')
	})

	it('time-period list passes --start-on and --end-on', async () => {
		const listTimePeriods = vi.fn().mockResolvedValue([])
		await run(
			{ listTimePeriods },
			...['time-period', 'list', '--workspace-gid', 'ws1', '--start-on', '2026-01-01', '--end-on', '2026-12-31'],
		)
		expect(listTimePeriods).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ startOn: '2026-01-01', endOn: '2026-12-31' }),
		)
	})
})

describe('goal MCP tools', () => {
	it('create forwards the new fields', async () => {
		const createGoal = vi.fn().mockResolvedValue({})
		await tools({ createGoal }).get('asana_goal_create')?.({
			workspace_gid: 'ws1',
			name: 'G',
			time_period_gid: 'tp1',
			owner_gid: 'u1',
			team_gid: 't1',
			is_workspace_level: true,
			liked: true,
			follower_gids: ['me'],
		})
		expect(createGoal).toHaveBeenCalledWith(
			'ws1',
			'G',
			{ time_period: 'tp1', owner: 'u1', team: 't1', is_workspace_level: true, liked: true, followers: ['me'] },
			undefined,
		)
	})

	it('create accepts comma-separated follower_gids', async () => {
		const createGoal = vi.fn().mockResolvedValue({})
		await tools({ createGoal }).get('asana_goal_create')?.({ workspace_gid: 'ws1', name: 'G', follower_gids: 'a,b' })
		expect(createGoal.mock.calls[0][2]).toEqual({ followers: ['a', 'b'] })
	})

	it('update forwards the new fields', async () => {
		const updateGoal = vi.fn().mockResolvedValue({})
		await tools({ updateGoal }).get('asana_goal_update')?.({
			goal_gid: 'g1',
			time_period_gid: 'tp1',
			owner_gid: 'u1',
			team_gid: 't1',
			is_workspace_level: false,
			liked: true,
			status: 'dropped',
			custom_fields: { '1': 'a' },
			html_custom_fields: { '2': 'x' },
		})
		expect(updateGoal).toHaveBeenCalledWith(
			'g1',
			{
				time_period: 'tp1',
				owner: 'u1',
				team: 't1',
				is_workspace_level: false,
				liked: true,
				status: 'dropped',
				custom_fields: { '1': 'a' },
				html_custom_fields: { '2': 'x' },
			},
			undefined,
		)
	})

	it('metric set forwards is_custom_weight', async () => {
		const setGoalMetric = vi.fn().mockResolvedValue({})
		await tools({ setGoalMetric }).get('asana_goal_metric_set')?.({ goal_gid: 'g1', is_custom_weight: true })
		expect(setGoalMetric).toHaveBeenCalledWith('g1', { isCustomWeight: true }, undefined)
	})

	it('list forwards the filters, with an optional workspace', async () => {
		const listGoals = vi.fn().mockResolvedValue([])
		await tools({ listGoals }).get('asana_goal_list')?.({
			portfolio_gid: 'pf',
			project_gid: 'pr',
			task_gid: 'tk',
			team_gid: 'tm',
			is_workspace_level: true,
			time_period_gids: 'a,b',
		})
		expect(listGoals).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({
				portfolio: 'pf',
				project: 'pr',
				task: 'tk',
				team: 'tm',
				isWorkspaceLevel: true,
				timePeriods: ['a', 'b'],
			}),
		)
	})

	it('list accepts time_period_gids as an array', async () => {
		const listGoals = vi.fn().mockResolvedValue([])
		await tools({ listGoals }).get('asana_goal_list')?.({ workspace_gid: 'ws1', time_period_gids: ['a'] })
		expect(listGoals).toHaveBeenCalledWith('ws1', expect.objectContaining({ timePeriods: ['a'] }))
	})

	it('time period list forwards start_on and end_on', async () => {
		const listTimePeriods = vi.fn().mockResolvedValue([])
		await tools({ listTimePeriods }).get('asana_time_period_list')?.({
			workspace_gid: 'ws1',
			start_on: '2026-01-01',
			end_on: '2026-12-31',
		})
		expect(listTimePeriods).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ startOn: '2026-01-01', endOn: '2026-12-31' }),
		)
	})
})

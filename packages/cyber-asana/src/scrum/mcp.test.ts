import { describe, expect, it, vi } from 'vitest'
import type { ScrumApi } from './api.js'
import { registerScrumTools } from './mcp.js'

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	const schemas = new Map<string, Record<string, unknown>>()
	return {
		handlers,
		schemas,
		tool(name: string, _description: string, schema: Record<string, unknown>, handler: ToolHandler) {
			handlers.set(name, handler)
			schemas.set(name, schema)
		},
	}
}

function fakeApi(): ScrumApi {
	return {
		listScopes: vi.fn(async () => ({ scopes: [] })),
		addScope: vi.fn(async (scope) => ({ scope, path: '/r.json', target: 'repo' as const })),
		removeScope: vi.fn(async (name) => ({
			removed: name,
			already_absent: false as const,
			path: '/r.json',
			target: 'repo' as const,
		})),
		resolveScope: vi.fn(async () => ({
			scope: { name: 'web', kind: 'project' as const, projects: ['1'] },
			implicit: false,
			projects: [{ gid: '1' }],
			sprint: { sprint_model: 'sections', sprint_length_days: 14 },
		})),
		currentSprint: vi.fn(async () => ({ sprint: { name: 'Sprint 2' } })),
		listSprints: vi.fn(async () => ({ sprints: [] })),
		sprintTasks: vi.fn(async () => ({ tasks: [] })),
		addToSprint: vi.fn(async () => ({ added: [] })),
		startSprint: vi.fn(async () => ({ created: [] })),
		reportSprint: vi.fn(async () => ({ completed: { count: 0 } })),
		reportRetro: vi.fn(async () => ({ carry_over: [] })),
		reportVelocity: vi.fn(async () => ({ sprints: [] })),
		closeSprint: vi.fn(async () => ({ moved: [] })),
		listBacklog: vi.fn(async () => ({ tasks: [] })),
		reportStandup: vi.fn(async () => ({ done: { count: 0 } })),
		reportHealth: vi.fn(async () => ({ counts: { error: 0, warning: 0 } })),
		reportWorkload: vi.fn(async () => ({ team: { people: 0 } })),
		reportTeamStandup: vi.fn(async () => ({ members: [] })),
	} as unknown as ScrumApi
}

describe('scrum/mcp', () => {
	it('registers the scope, sprint, and backlog tools under the asana_<resource>_<action> naming', () => {
		const server = createServer()
		registerScrumTools(server as any, fakeApi())
		expect([...server.handlers.keys()].sort()).toEqual(
			[
				'asana_scope_add',
				'asana_scope_list',
				'asana_scope_remove',
				'asana_scope_resolve',
				'asana_sprint_add',
				'asana_sprint_close',
				'asana_sprint_current',
				'asana_sprint_list',
				'asana_sprint_start',
				'asana_sprint_tasks',
				'asana_backlog_list',
				'asana_report_standup',
				'asana_report_health',
				'asana_report_workload',
				'asana_report_sprint',
				'asana_report_retro',
				'asana_report_velocity',
			].sort(),
		)
	})

	it('asana_scope_list returns the listing as JSON', async () => {
		const server = createServer()
		registerScrumTools(server as any, fakeApi())
		const result = await server.handlers.get('asana_scope_list')?.({})
		expect(JSON.parse(result.content[0].text)).toEqual({ scopes: [] })
	})

	it('asana_scope_add builds the entry from snake_case params and forwards global', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_scope_add')?.({
			name: 'platform',
			kind: 'projects',
			project_gids: ['1', '2'],
			default: true,
			sprint_model: 'custom-field',
			sprint_length_days: 7,
			sprint_anchor_date: '2026-01-05',
			global: true,
		})
		expect(api.addScope).toHaveBeenCalledWith(
			{
				name: 'platform',
				kind: 'projects',
				projects: ['1', '2'],
				default: true,
				sprint_model: 'custom-field',
				sprint_length_days: 7,
				sprint_anchor_date: '2026-01-05',
			},
			{ global: true },
		)
	})

	it('asana_scope_add builds a portfolio scope', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_scope_add')?.({ name: 'growth', kind: 'portfolio', portfolio_gid: '1300' })
		expect(api.addScope).toHaveBeenCalledWith(
			{ name: 'growth', kind: 'portfolio', portfolio: '1300' },
			{ global: undefined },
		)
	})

	it('asana_scope_add builds a team scope', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_scope_add')?.({ name: 'web-team', kind: 'team', team_gid: '1400' })
		expect(api.addScope).toHaveBeenCalledWith({ name: 'web-team', kind: 'team', team: '1400' }, { global: undefined })
	})

	it('asana_scope_remove forwards the name', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_scope_remove')?.({ name: 'web', global: true })
		expect(api.removeScope).toHaveBeenCalledWith('web', { global: true })
	})

	it('asana_scope_resolve forwards the scope name and the tasks flag', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		const result = await server.handlers.get('asana_scope_resolve')?.({ scope: 'web', tasks: true })
		expect(api.resolveScope).toHaveBeenCalledWith({ scope: 'web', tasks: true })
		expect(JSON.parse(result.content[0].text).projects).toEqual([{ gid: '1' }])
	})

	it('sprint tools forward scope and sprint to the api', async () => {
		const api = fakeApi()
		const server = createServer()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_sprint_current')?.({ scope: 'web' })
		expect(api.currentSprint).toHaveBeenCalledWith({ scope: 'web' })
		await server.handlers.get('asana_sprint_tasks')?.({ scope: 'web', sprint: 'previous', incomplete: true })
		expect(api.sprintTasks).toHaveBeenCalledWith({ scope: 'web', sprint: 'previous', incomplete: true })
		await server.handlers.get('asana_sprint_add')?.({ task_gids: ['1', '2'], sprint: 'next' })
		expect(api.addToSprint).toHaveBeenCalledWith({ tasks: ['1', '2'], sprint: 'next' })
		await server.handlers.get('asana_sprint_start')?.({ sprint: 'next' })
		expect(api.startSprint).toHaveBeenCalledWith({ sprint: 'next' })
		await server.handlers.get('asana_sprint_close')?.({})
		expect(api.closeSprint).toHaveBeenCalledWith({})
		await server.handlers.get('asana_sprint_list')?.({})
		expect(api.listSprints).toHaveBeenCalledWith({})
		const result = await server.handlers.get('asana_backlog_list')?.({ scope: 'web' })
		expect(api.listBacklog).toHaveBeenCalledWith({ scope: 'web' })
		expect(JSON.parse(result.content[0].text)).toEqual({ tasks: [] })
	})

	it('accepts every scope kind, team included', () => {
		const server = createServer()
		registerScrumTools(server as any, fakeApi())
		const kind = server.schemas.get('asana_scope_add')?.kind as { safeParse: (v: unknown) => { success: boolean } }
		for (const k of ['project', 'projects', 'portfolio', 'team']) expect(kind.safeParse(k).success).toBe(true)
		expect(kind.safeParse('cohort').success).toBe(false)
	})

	it('asana_report_standup with team asks the api for the team standup', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		const result = await server.handlers.get('asana_report_standup')?.({ scope: 'web', team: true })
		expect(api.reportTeamStandup).toHaveBeenCalledWith({ scope: 'web' })
		expect(api.reportStandup).not.toHaveBeenCalled()
		expect(JSON.parse(result.content[0].text).members).toEqual([])
	})

	it('asana_report_standup passes scope, sprint, member and team to the api', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		const result = await server.handlers.get('asana_report_standup')?.({
			scope: 'web',
			sprint: 'previous',
			member: 'a@b.io',
		})
		expect(api.reportStandup).toHaveBeenCalledWith({ scope: 'web', sprint: 'previous', member: 'a@b.io' })
		expect(JSON.parse(result.content[0].text).done.count).toBe(0)
	})

	it('asana_report_health passes scope and sprint to the api', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		const result = await server.handlers.get('asana_report_health')?.({ scope: 'web', sprint: 'previous' })
		expect(api.reportHealth).toHaveBeenCalledWith({ scope: 'web', sprint: 'previous' })
		expect(JSON.parse(result.content[0].text).counts.error).toBe(0)
	})

	it('asana_report_workload passes scope, sprint, and the from/to window to the api', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_report_workload')?.({ scope: 'web', from: '2026-01-19', to: '2026-01-23' })
		expect(api.reportWorkload).toHaveBeenCalledWith({ scope: 'web', from: '2026-01-19', to: '2026-01-23' })
		await server.handlers.get('asana_report_workload')?.({ sprint: 'previous' })
		expect(api.reportWorkload).toHaveBeenLastCalledWith({ sprint: 'previous' })
	})

	it('asana_report_sprint | retro | velocity forward scope and sprint to the api', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_report_sprint')?.({ scope: 'web', sprint: 'previous' })
		expect(api.reportSprint).toHaveBeenCalledWith({ scope: 'web', sprint: 'previous' })
		await server.handlers.get('asana_report_retro')?.({ sprint: '3' })
		expect(api.reportRetro).toHaveBeenCalledWith({ sprint: '3' })
		const result = await server.handlers.get('asana_report_velocity')?.({ scope: 'web' })
		expect(api.reportVelocity).toHaveBeenCalledWith({ scope: 'web' })
		expect(JSON.parse(result.content[0].text)).toEqual({ sprints: [] })
	})

	it('asana_sprint_start passes snapshot only when asked', async () => {
		const server = createServer()
		const api = fakeApi()
		registerScrumTools(server as any, api)
		await server.handlers.get('asana_sprint_start')?.({ snapshot: true })
		expect(api.startSprint).toHaveBeenCalledWith({ snapshot: true })
	})
})

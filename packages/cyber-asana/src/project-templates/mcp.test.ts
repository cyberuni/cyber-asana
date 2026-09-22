import { afterEach, describe, expect, it, vi } from 'vitest'

const listProjectTemplatesMock = vi.fn()
const listProjectTemplatesForTeamMock = vi.fn()
const getProjectTemplateMock = vi.fn()
const instantiateProjectMock = vi.fn()
const instantiateProjectAndWaitMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listProjectTemplates: listProjectTemplatesMock,
		listProjectTemplatesForTeam: listProjectTemplatesForTeamMock,
		getProjectTemplate: getProjectTemplateMock,
		instantiateProject: instantiateProjectMock,
		instantiateProjectAndWait: instantiateProjectAndWaitMock,
	}
})

const { registerProjectTemplateTools } = await import('./mcp.js')

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

describe('project-templates/mcp', () => {
	afterEach(() => vi.clearAllMocks())

	it('asana_project_template_list forwards the workspace filter and pagination', async () => {
		listProjectTemplatesMock.mockResolvedValue([])
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_list')?.({ workspace_gid: 'ws1', limit: 5 })

		expect(listProjectTemplatesMock).toHaveBeenCalledWith({ workspace: 'ws1' }, expect.objectContaining({ limit: 5 }))
	})

	it('asana_project_template_list uses the team endpoint when a team is given', async () => {
		listProjectTemplatesForTeamMock.mockResolvedValue([])
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_list')?.({ team_gid: 'team1' })

		expect(listProjectTemplatesForTeamMock).toHaveBeenCalledWith('team1', expect.anything())
		expect(listProjectTemplatesMock).not.toHaveBeenCalled()
	})

	it('asana_project_template_get returns the template', async () => {
		getProjectTemplateMock.mockResolvedValue({ gid: 'tpl1', name: 'Client onboarding' })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		const result = await server.handlers.get('asana_project_template_get')?.({ project_template_gid: 'tpl1' })

		expect(getProjectTemplateMock).toHaveBeenCalledWith('tpl1', undefined)
		expect(JSON.parse(result.content[0].text)).toEqual({ gid: 'tpl1', name: 'Client onboarding' })
	})

	it('asana_project_template_instantiate waits by default and reports the new project GID', async () => {
		instantiateProjectAndWaitMock.mockResolvedValue({
			gid: 'job1',
			status: 'succeeded',
			new_project: { gid: 'proj1' },
		})
		const server = createServer()
		registerProjectTemplateTools(server as any)

		const result = await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme onboarding',
			team_gid: 'team1',
			public: true,
			requested_dates: [{ gid: 'date1', value: '2026-09-01' }],
		})

		expect(instantiateProjectAndWaitMock).toHaveBeenCalledWith(
			'tpl1',
			{
				name: 'Acme onboarding',
				team: 'team1',
				public: true,
				requestedDates: [{ gid: 'date1', value: '2026-09-01' }],
			},
			{ maxAttempts: 60, intervalMs: 1000 },
		)
		expect(JSON.parse(result.content[0].text)).toEqual({
			job: { gid: 'job1', status: 'succeeded', new_project: { gid: 'proj1' } },
			project_gid: 'proj1',
		})
	})

	it('asana_project_template_instantiate honours timeout_seconds', async () => {
		instantiateProjectAndWaitMock.mockResolvedValue({ gid: 'job1', status: 'succeeded' })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme',
			timeout_seconds: 10,
		})

		expect(instantiateProjectAndWaitMock).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme' },
			{ maxAttempts: 10, intervalMs: 1000 },
		)
	})

	it('asana_project_template_instantiate with wait false returns the job only', async () => {
		instantiateProjectMock.mockResolvedValue({ gid: 'job1', status: 'not_started' })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		const result = await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme',
			wait: false,
		})

		expect(instantiateProjectMock).toHaveBeenCalledWith('tpl1', { name: 'Acme' })
		expect(instantiateProjectAndWaitMock).not.toHaveBeenCalled()
		expect(JSON.parse(result.content[0].text)).toEqual({
			job: { gid: 'job1', status: 'not_started' },
			project_gid: null,
		})
	})

	it('asana_project_template_instantiate forwards the privacy setting', async () => {
		instantiateProjectAndWaitMock.mockResolvedValue({ gid: 'job1', new_project: { gid: 'proj1' } })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme',
			privacy_setting: 'private_to_team',
		})

		expect(instantiateProjectAndWaitMock).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme', privacySetting: 'private_to_team' },
			expect.anything(),
		)
	})

	it('asana_project_template_instantiate forwards the strict date flag', async () => {
		instantiateProjectAndWaitMock.mockResolvedValue({ gid: 'job1', new_project: { gid: 'proj1' } })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme',
			is_strict: true,
		})

		expect(instantiateProjectAndWaitMock).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme', isStrict: true },
			expect.anything(),
		)
	})

	it('asana_project_template_instantiate forwards requested roles', async () => {
		instantiateProjectAndWaitMock.mockResolvedValue({ gid: 'job1', new_project: { gid: 'proj1' } })
		const server = createServer()
		registerProjectTemplateTools(server as any)

		await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme',
			requested_roles: [{ gid: 'role1', value: 'me' }],
		})

		expect(instantiateProjectAndWaitMock).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme', requestedRoles: [{ gid: 'role1', value: 'me' }] },
			expect.anything(),
		)
	})
})

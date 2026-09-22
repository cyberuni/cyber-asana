import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type RuntimeContext, registerCliCommands, registerMcpTools } from './composition.js'

function mockRuntimeContext(): RuntimeContext {
	return {
		workspaces: { listWorkspaces: vi.fn(), getWorkspace: vi.fn() },
		projects: {
			listProjects: vi.fn(),
			getProject: vi.fn(),
			getProjectTaskCounts: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			searchProjects: vi.fn(),
			exportProject: vi.fn(),
		},
		tasks: {
			listTasks: vi.fn(),
			listTasksForSection: vi.fn(),
			getTask: vi.fn(),
			getTasksByGid: vi.fn(),
			createTask: vi.fn(),
			updateTask: vi.fn(),
			deleteTask: vi.fn(),
			getMyTasks: vi.fn(),
			listSubtasks: vi.fn(),
			createSubtask: vi.fn(),
			addTaskToProject: vi.fn(),
			removeTaskFromProject: vi.fn(),
			addFollowersToTask: vi.fn(),
			removeFollowersFromTask: vi.fn(),
			getDependencies: vi.fn(),
			getDependents: vi.fn(),
			addDependencies: vi.fn(),
			addDependents: vi.fn(),
			removeDependencies: vi.fn(),
			removeDependents: vi.fn(),
			searchTasks: vi.fn(),
		},
		search: { searchObjects: vi.fn() },
		sections: {
			listSections: vi.fn(),
			getSection: vi.fn(),
			createSection: vi.fn(),
			updateSection: vi.fn(),
			deleteSection: vi.fn(),
			moveSection: vi.fn(),
			addTaskToSection: vi.fn(),
		},
		users: { listUsers: vi.fn(), getUser: vi.fn(), getMe: vi.fn() },
		teams: { listTeams: vi.fn(), getTeam: vi.fn() },
		customFields: {
			listCustomFields: vi.fn(),
			getCustomField: vi.fn(),
			listCustomFieldSettingsForProject: vi.fn(),
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
		},
		portfolios: {
			listPortfolios: vi.fn(),
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		},
		goals: {
			listGoals: vi.fn(),
			getGoal: vi.fn(),
			createGoal: vi.fn(),
			updateGoal: vi.fn(),
			deleteGoal: vi.fn(),
		},
		tags: {
			listTags: vi.fn(),
			getTag: vi.fn(),
			createTag: vi.fn(),
			updateTag: vi.fn(),
			deleteTag: vi.fn(),
			listTagsForTask: vi.fn(),
			listTasksForTag: vi.fn(),
			addTagToTask: vi.fn(),
			removeTagFromTask: vi.fn(),
		},
		attachments: {
			listAttachments: vi.fn(),
			getAttachment: vi.fn(),
			createAttachment: vi.fn(),
			deleteAttachment: vi.fn(),
		},
		ooo: {
			listOooEntries: vi.fn(),
			getOooEntry: vi.fn(),
			createOooEntry: vi.fn(),
			updateOooEntry: vi.fn(),
			deleteOooEntry: vi.fn(),
		},
		stories: {
			listStories: vi.fn(),
			createStory: vi.fn(),
			getStory: vi.fn(),
			updateStory: vi.fn(),
			deleteStory: vi.fn(),
			getTaskTemplateData: vi.fn(),
		},
		taskTemplates: {
			listTaskTemplates: vi.fn(),
			getTaskTemplate: vi.fn(),
			instantiateTask: vi.fn(),
		},
		memberships: {
			listMemberships: vi.fn(),
			getMembership: vi.fn(),
			createMembership: vi.fn(),
			updateMembership: vi.fn(),
			deleteMembership: vi.fn(),
		},
		jobs: { getJob: vi.fn() },
		projectTemplates: {
			listProjectTemplates: vi.fn(),
			listProjectTemplatesForTeam: vi.fn(),
			getProjectTemplate: vi.fn(),
			instantiateProject: vi.fn(),
			instantiateProjectAndWait: vi.fn(),
		},
		status: {
			listStatuses: vi.fn(),
			getStatus: vi.fn(),
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
			getStatusOverview: vi.fn(),
		},
		rules: { triggerRule: vi.fn() },
		events: { getEvents: vi.fn() },
	}
}

type ToolHandler = (params: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>

function createMcpServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('composition wiring', () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
	})

	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	it('CLI auth status reports the credential without calling the Asana API', async () => {
		const ctx = mockRuntimeContext()
		const program = new Command()
		registerCliCommands(program, () => ctx)
		const previous = process.env.ASANA_ACCESS_TOKEN
		process.env.ASANA_ACCESS_TOKEN = 'wiring-token'

		try {
			await program.parseAsync(['node', 'test', 'auth', 'status'], { from: 'node' })
		} finally {
			if (previous === undefined) delete process.env.ASANA_ACCESS_TOKEN
			else process.env.ASANA_ACCESS_TOKEN = previous
		}

		const logged = vi
			.mocked(console.log)
			.mock.calls.map((call) => String(call[0]))
			.join('\n')
		expect(logged).toContain('ASANA_ACCESS_TOKEN')
		expect(ctx.users.getMe).not.toHaveBeenCalled()
	})

	it('CLI workspace get uses runtime context workspaces api', async () => {
		const ctx = mockRuntimeContext()
		ctx.workspaces.getWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'workspace', 'get', 'ws1'], { from: 'node' })

		expect(ctx.workspaces.getWorkspace).toHaveBeenCalledWith('ws1', undefined)
	})

	it('CLI task create uses runtime context tasks api', async () => {
		const ctx = mockRuntimeContext()
		ctx.tasks.createTask = vi.fn().mockResolvedValue({ gid: 'task1', name: 'New Task' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'task', 'create', 'New Task', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(ctx.tasks.createTask).toHaveBeenCalledWith('ws1', 'New Task', {})
	})

	it('CLI tag create uses runtime context tags api', async () => {
		const ctx = mockRuntimeContext()
		ctx.tags.createTag = vi.fn().mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'tag', 'create', 'Urgent', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(ctx.tags.createTag).toHaveBeenCalledWith('ws1', 'Urgent', {})
	})

	it('CLI task-template instantiate uses runtime context task templates api', async () => {
		const ctx = mockRuntimeContext()
		ctx.taskTemplates.instantiateTask = vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'task-template', 'instantiate', 'tt1', '--no-wait'], { from: 'node' })

		expect(ctx.taskTemplates.instantiateTask).toHaveBeenCalledWith(
			'tt1',
			{},
			expect.objectContaining({ maxAttempts: 0 }),
		)
	})

	it('MCP asana_task_template_list uses runtime context task templates api', async () => {
		const ctx = mockRuntimeContext()
		ctx.taskTemplates.listTaskTemplates = vi.fn().mockResolvedValue([])
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_task_template_list')?.({ project_gid: 'p1' })

		expect(ctx.taskTemplates.listTaskTemplates).toHaveBeenCalledWith('p1', expect.any(Object))
	})

	it('CLI ooo list uses runtime context ooo api', async () => {
		const ctx = mockRuntimeContext()
		ctx.ooo.listOooEntries = vi.fn().mockResolvedValue({ data: [] })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'ooo', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(ctx.ooo.listOooEntries).toHaveBeenCalledWith('me', 'ws1', expect.anything())
	})

	it('MCP asana_ooo_list uses runtime context ooo api', async () => {
		const ctx = mockRuntimeContext()
		ctx.ooo.listOooEntries = vi.fn().mockResolvedValue({ data: [] })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_ooo_list')?.({ workspace_gid: 'ws1' })

		expect(ctx.ooo.listOooEntries).toHaveBeenCalledWith('me', 'ws1', {})
	})

	it('CLI status create uses runtime context status api', async () => {
		const ctx = mockRuntimeContext()
		ctx.status.createStatus = vi.fn().mockResolvedValue({ gid: 'st1', status_type: 'on_track' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(
			['node', 'test', 'status', 'create', '--parent-gid', 'proj1', '--status-type', 'on_track', '--text', 'All good'],
			{ from: 'node' },
		)

		expect(ctx.status.createStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})

	it('MCP asana_status_create uses runtime context status api', async () => {
		const ctx = mockRuntimeContext()
		ctx.status.createStatus = vi.fn().mockResolvedValue({ gid: 'st1', status_type: 'on_track' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_status_create')?.({
			parent_gid: 'proj1',
			status_type: 'on_track',
			text: 'All good',
		})

		expect(ctx.status.createStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})

	it('CLI custom-field get uses runtime context customFields api', async () => {
		const ctx = mockRuntimeContext()
		ctx.customFields.getCustomField = vi.fn().mockResolvedValue({ gid: 'cf1', name: 'Priority' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'custom-field', 'get', 'cf1'], { from: 'node' })

		expect(ctx.customFields.getCustomField).toHaveBeenCalledWith('cf1', undefined)
	})

	it('CLI custom-field project uses runtime context customFields api', async () => {
		const ctx = mockRuntimeContext()
		ctx.customFields.listCustomFieldSettingsForProject = vi.fn().mockResolvedValue([])
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'custom-field', 'project', 'proj1'], { from: 'node' })

		expect(ctx.customFields.listCustomFieldSettingsForProject).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ optFields: expect.stringContaining('custom_field.name') }),
		)
	})

	it('MCP asana_custom_field_list_for_project uses runtime context customFields api', async () => {
		const ctx = mockRuntimeContext()
		ctx.customFields.listCustomFieldSettingsForProject = vi.fn().mockResolvedValue([])
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_custom_field_list_for_project')?.({ project_gid: 'proj1' })

		expect(ctx.customFields.listCustomFieldSettingsForProject).toHaveBeenCalledWith('proj1', {})
	})

	it('MCP asana_custom_field_list uses runtime context customFields api', async () => {
		const ctx = mockRuntimeContext()
		ctx.customFields.listCustomFields = vi.fn().mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_custom_field_list')?.({ workspace_gid: 'ws1' })

		expect(ctx.customFields.listCustomFields).toHaveBeenCalledWith('ws1', {})
	})

	it('CLI rule trigger uses runtime context rules api', async () => {
		const ctx = mockRuntimeContext()
		ctx.rules.triggerRule = vi.fn().mockResolvedValue({ triggered: true, rule_trigger_gid: 'rt1' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1', '--resource', 'task1'], { from: 'node' })

		expect(ctx.rules.triggerRule).toHaveBeenCalledWith('rt1', { resource: 'task1' })
	})

	it('MCP asana_rule_trigger uses runtime context rules api', async () => {
		const ctx = mockRuntimeContext()
		ctx.rules.triggerRule = vi.fn().mockResolvedValue({ triggered: true, rule_trigger_gid: 'rt1' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_rule_trigger')?.({ rule_trigger_gid: 'rt1', resource: 'task1' })

		expect(ctx.rules.triggerRule).toHaveBeenCalledWith('rt1', { resource: 'task1' })
	})

	it('CLI event list uses runtime context events api', async () => {
		const ctx = mockRuntimeContext()
		ctx.events.getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'event', 'list', 'proj1', '--sync', 'tok-1'], { from: 'node' })

		expect(ctx.events.getEvents).toHaveBeenCalledWith('proj1', { sync: 'tok-1' })
	})

	it('MCP asana_event_list uses runtime context events api', async () => {
		const ctx = mockRuntimeContext()
		ctx.events.getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_event_list')?.({ resource_gid: 'proj1', sync: 'tok-1' })

		expect(ctx.events.getEvents).toHaveBeenCalledWith('proj1', { sync: 'tok-1' })
	})

	it('CLI membership list uses runtime context memberships api', async () => {
		const ctx = mockRuntimeContext()
		ctx.memberships.listMemberships = vi.fn().mockResolvedValue([])
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'membership', 'list', '--parent-gid', 'proj1'], { from: 'node' })

		expect(ctx.memberships.listMemberships).toHaveBeenCalledWith(
			{ parent: 'proj1' },
			expect.objectContaining({ optFields: 'gid,member.name,access_level' }),
		)
	})

	it('MCP asana_membership_create uses runtime context memberships api', async () => {
		const ctx = mockRuntimeContext()
		ctx.memberships.createMembership = vi.fn().mockResolvedValue({ gid: 'm1' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_membership_create')?.({
			parent_gid: 'proj1',
			member_gid: 'u1',
			access_level: 'editor',
		})

		expect(ctx.memberships.createMembership).toHaveBeenCalledWith('proj1', 'u1', { access_level: 'editor' })
	})

	it('CLI job get uses runtime context jobs api', async () => {
		const ctx = mockRuntimeContext()
		ctx.jobs.getJob = vi.fn().mockResolvedValue({ gid: 'job1', status: 'succeeded' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'job', 'get', 'job1'], { from: 'node' })

		expect(ctx.jobs.getJob).toHaveBeenCalledWith('job1', undefined)
	})

	it('MCP asana_job_get uses runtime context jobs api', async () => {
		const ctx = mockRuntimeContext()
		ctx.jobs.getJob = vi.fn().mockResolvedValue({ gid: 'job1', status: 'succeeded' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_job_get')?.({ job_gid: 'job1' })

		expect(ctx.jobs.getJob).toHaveBeenCalledWith('job1', undefined)
	})

	it('CLI project-template instantiate uses runtime context project templates api', async () => {
		const ctx = mockRuntimeContext()
		ctx.projectTemplates.instantiateProjectAndWait = vi
			.fn()
			.mockResolvedValue({ gid: 'job1', status: 'succeeded', new_project: { gid: 'proj1' } })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme onboarding'], {
			from: 'node',
		})

		expect(ctx.projectTemplates.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme onboarding' },
			expect.objectContaining({ maxAttempts: 60 }),
		)
	})

	it('MCP asana_project_template_instantiate uses runtime context project templates api', async () => {
		const ctx = mockRuntimeContext()
		ctx.projectTemplates.instantiateProjectAndWait = vi
			.fn()
			.mockResolvedValue({ gid: 'job1', status: 'succeeded', new_project: { gid: 'proj1' } })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_project_template_instantiate')?.({
			project_template_gid: 'tpl1',
			name: 'Acme onboarding',
		})

		expect(ctx.projectTemplates.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme onboarding' },
			expect.objectContaining({ maxAttempts: 60 }),
		)
	})

	it('CLI search objects uses runtime context search api', async () => {
		const ctx = mockRuntimeContext()
		ctx.search.searchObjects = vi.fn().mockResolvedValue([])
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'search', 'objects', 'project', 'website', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(ctx.search.searchObjects).toHaveBeenCalledWith('ws1', 'project', {
			query: 'website',
			count: undefined,
			optFields: 'gid,name,resource_type',
		})
	})

	it('MCP asana_search_objects uses runtime context search api', async () => {
		const ctx = mockRuntimeContext()
		ctx.search.searchObjects = vi.fn().mockResolvedValue([])
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_search_objects')?.({
			workspace_gid: 'ws1',
			resource_type: 'project',
			query: 'website',
		})

		expect(ctx.search.searchObjects).toHaveBeenCalledWith('ws1', 'project', {
			query: 'website',
			count: undefined,
			optFields: 'gid,name,resource_type',
		})
	})

	it('MCP asana_workspace_get uses runtime context workspaces api', async () => {
		const ctx = mockRuntimeContext()
		ctx.workspaces.getWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_workspace_get')?.({ workspace_gid: 'ws1' })

		expect(ctx.workspaces.getWorkspace).toHaveBeenCalledWith('ws1', undefined)
	})

	it('MCP asana_task_create uses runtime context tasks api', async () => {
		const ctx = mockRuntimeContext()
		ctx.tasks.createTask = vi.fn().mockResolvedValue({ gid: 'task1', name: 'New Task' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_task_create')?.({
			workspace_gid: 'ws1',
			name: 'New Task',
		})

		expect(ctx.tasks.createTask).toHaveBeenCalledWith('ws1', 'New Task', {})
	})
})

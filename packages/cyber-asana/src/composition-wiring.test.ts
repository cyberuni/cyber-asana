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
		sections: {
			listSections: vi.fn(),
			getSection: vi.fn(),
			createSection: vi.fn(),
			updateSection: vi.fn(),
			deleteSection: vi.fn(),
		},
		users: { listUsers: vi.fn(), getUser: vi.fn(), getMe: vi.fn() },
		teams: { listTeams: vi.fn(), getTeam: vi.fn() },
		portfolios: {
			listPortfolios: vi.fn(),
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
		attachments: { listAttachments: vi.fn(), getAttachment: vi.fn() },
		stories: { listStories: vi.fn(), createStory: vi.fn(), getTaskTemplateData: vi.fn() },
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

	it('CLI workspace get uses runtime context workspaces api', async () => {
		const ctx = mockRuntimeContext()
		ctx.workspaces.getWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const program = new Command()
		registerCliCommands(program, () => ctx)

		await program.parseAsync(['node', 'test', 'workspace', 'get', 'ws1'], { from: 'node' })

		expect(ctx.workspaces.getWorkspace).toHaveBeenCalledWith('ws1')
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

	it('MCP asana_workspace_get uses runtime context workspaces api', async () => {
		const ctx = mockRuntimeContext()
		ctx.workspaces.getWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const server = createMcpServer()
		registerMcpTools(server as never, () => ctx)

		await server.handlers.get('asana_workspace_get')?.({ workspace_gid: 'ws1' })

		expect(ctx.workspaces.getWorkspace).toHaveBeenCalledWith('ws1')
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

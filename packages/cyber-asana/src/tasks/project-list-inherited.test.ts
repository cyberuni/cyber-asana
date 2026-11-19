import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskCommand } from './cli.js'
import { createAsanaTaskGateway } from './gateway.js'
import { registerTaskTools } from './mcp.js'

describe('task project list: include inherited projects', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends include_inherited_projects only when asked', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProjectsForTask').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaTaskGateway({} as Asana.ApiClient)
		await gateway.listProjectsForTask('t1', { includeInheritedProjects: true })
		expect(Asana.ProjectsApi.prototype.getProjectsForTask).toHaveBeenLastCalledWith('t1', {
			include_inherited_projects: true,
			limit: 100,
		})
		await gateway.listProjectsForTask('t1', {})
		expect(Asana.ProjectsApi.prototype.getProjectsForTask).toHaveBeenLastCalledWith('t1', { limit: 100 })
	})

	it('task project list --include-inherited reaches the api', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listProjectsForTask = vi.fn().mockResolvedValue({ data: [], next_page: null })
		await new Command()
			.addCommand(taskCommand({ listProjectsForTask } as never))
			.parseAsync(['node', 'test', 'task', 'project', 'list', 't1', '--include-inherited'], { from: 'node' })
		expect(listProjectsForTask).toHaveBeenCalledWith('t1', expect.objectContaining({ includeInheritedProjects: true }))
	})

	it('asana_task_project_list forwards include_inherited_projects', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const listProjectsForTask = vi.fn().mockResolvedValue({ data: [] })
		registerTaskTools(
			{ tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) } as never,
			{
				listProjectsForTask,
			} as never,
		)
		await handlers.get('asana_task_project_list')?.({ task_gid: 't1', include_inherited_projects: true })
		expect(listProjectsForTask).toHaveBeenCalledWith('t1', expect.objectContaining({ includeInheritedProjects: true }))
	})
})

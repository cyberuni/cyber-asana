import Asana from 'asana'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createClient } from '../platform/client.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const enabled = isSystemTestEnabled() && Boolean(taskGid)
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const workspaceGid = systemEnv('ASANA_WORKSPACE')
const workspaceEnabled = isSystemTestEnabled() && Boolean(workspaceGid)
const projectEnabled = isSystemTestEnabled() && Boolean(projectGid)

describe.skipIf(!enabled)('asana types: TasksApi', () => {
	it('getTask returns a Task whose shape matches the augmented type', async () => {
		const api = new Asana.TasksApi(createClient())

		const res = await api.getTask(taskGid!, {
			opt_fields: 'name,resource_type,completed,permalink_url,notes,assignee.name,projects.name',
		})

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
		const task = res.data
		expect(task.gid).toBe(taskGid)
		expect(typeof task.name).toBe('string')
		expect(task.resource_type).toBe('task')
		expect(typeof task.completed).toBe('boolean')
		expect(typeof task.permalink_url).toBe('string')
		expect(typeof task.notes).toBe('string')
		if (task.assignee) expect(typeof task.assignee.gid).toBe('string')
		for (const project of task.projects ?? []) expect(typeof project.gid).toBe('string')
	})
})

describe.skipIf(!projectEnabled)('asana types: ProjectsApi', () => {
	it('getProject returns a Project whose shape matches the augmented type', async () => {
		const api = new Asana.ProjectsApi(createClient())

		const res = await api.getProject(projectGid!, {
			opt_fields: 'name,resource_type,archived,permalink_url,notes,owner.name,workspace.name',
		})

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Project>>()
		const project = res.data
		expect(project.gid).toBe(projectGid)
		expect(typeof project.name).toBe('string')
		expect(project.resource_type).toBe('project')
		expect(typeof project.archived).toBe('boolean')
		expect(typeof project.permalink_url).toBe('string')
		expect(typeof project.notes).toBe('string')
		if (project.owner) expect(typeof project.owner.gid).toBe('string')
		expect(typeof project.workspace?.gid).toBe('string')
	})
})

describe.skipIf(!workspaceEnabled)('asana types: list collections', () => {
	it('getProjectsForWorkspace returns a Collection whose shape matches AsanaCollection', async () => {
		const api = new Asana.ProjectsApi(createClient())

		const page = await api.getProjectsForWorkspace(workspaceGid!, { limit: 1, opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Project>>()
		expect(Array.isArray(page.data)).toBe(true)
		for (const project of page.data) {
			expect(typeof project.gid).toBe('string')
			expect(project.resource_type).toBe('project')
		}
		expect(typeof page.nextPage).toBe('function')
		const next = page._response.next_page
		if (next) expect(typeof next.offset).toBe('string')
		else expect(next).toBeNull()
	})
})

describe.skipIf(!projectEnabled)('asana types: task list collections', () => {
	it('getTasksForProject returns a Collection whose nextPage ends with data: null', async () => {
		const api = new Asana.TasksApi(createClient())

		const first = await api.getTasksForProject(projectGid!, { limit: 100, opt_fields: 'name,resource_type' })

		expectTypeOf(first).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
		let page: Asana.AsanaCollection<Asana.Task> | { data: null } = first
		for (let pages = 0; page.data !== null && pages < 50; pages++) {
			for (const task of page.data) expect(task.resource_type).toBe('task')
			page = await page.nextPage()
		}
		expect(page.data).toBeNull()
	})
})

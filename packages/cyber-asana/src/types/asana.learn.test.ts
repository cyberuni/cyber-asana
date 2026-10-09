import Asana from 'asana'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createClient } from '../platform/client.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const enabled = isSystemTestEnabled() && Boolean(taskGid)
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const workspaceGid = systemEnv('ASANA_WORKSPACE')
const workspaceEnabled = isSystemTestEnabled() && Boolean(workspaceGid)
const sectionGid = systemEnv('ASANA_SYSTEM_TEST_SECTION_GID')
const sectionEnabled = isSystemTestEnabled() && Boolean(sectionGid) && Boolean(projectGid)
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

describe.skipIf(!sectionEnabled)('asana types: SectionsApi', () => {
	it('getSection returns a Section whose shape matches the augmented type', async () => {
		const api = new Asana.SectionsApi(createClient())

		const res = await api.getSection(sectionGid!, { opt_fields: 'name,resource_type,created_at,project.name' })

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Section>>()
		expect(res.data.gid).toBe(sectionGid)
		expect(res.data.resource_type).toBe('section')
		expect(typeof res.data.name).toBe('string')
		expect(typeof res.data.created_at).toBe('string')
		expect(res.data.project?.gid).toBe(projectGid)
	})

	it('getSectionsForProject returns a Collection of Sections that includes it', async () => {
		const api = new Asana.SectionsApi(createClient())

		const page = await api.getSectionsForProject(projectGid!, { opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Section>>()
		expect(page.data.map((section) => section.gid)).toContain(sectionGid)
		for (const section of page.data) expect(section.resource_type).toBe('section')
	})
})

describe.skipIf(!isSystemTestEnabled())('asana types: UsersApi', () => {
	it('getUser("me") returns a User whose shape matches the augmented type', async () => {
		const api = new Asana.UsersApi(createClient())

		const res = await api.getUser('me', { opt_fields: 'name,email,resource_type,workspaces.name' })

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.User>>()
		expect(res.data.resource_type).toBe('user')
		expect(typeof res.data.name).toBe('string')
		expect(typeof res.data.email).toBe('string')
		expect(Array.isArray(res.data.workspaces)).toBe(true)
		for (const workspace of res.data.workspaces ?? []) expect(typeof workspace.gid).toBe('string')
	})
})

describe.skipIf(!workspaceEnabled)('asana types: workspace users, workspaces and tags', () => {
	it('getUsersForWorkspace returns a Collection of Users', async () => {
		const api = new Asana.UsersApi(createClient())

		const page = await api.getUsersForWorkspace(workspaceGid!, { opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.User>>()
		expect(page.data.length).toBeGreaterThan(0)
		for (const user of page.data) expect(user.resource_type).toBe('user')
	})

	it('getWorkspace returns a Workspace whose shape matches the augmented type', async () => {
		const api = new Asana.WorkspacesApi(createClient())

		const res = await api.getWorkspace(workspaceGid!, { opt_fields: 'name,resource_type,is_organization' })

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Workspace>>()
		expect(res.data.gid).toBe(workspaceGid)
		expect(res.data.resource_type).toBe('workspace')
		expect(typeof res.data.name).toBe('string')
		expect(typeof res.data.is_organization).toBe('boolean')
	})

	it('getWorkspaces returns a Collection of Workspaces that includes it', async () => {
		const api = new Asana.WorkspacesApi(createClient())

		const page = await api.getWorkspaces({ opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Workspace>>()
		expect(page.data.map((workspace) => workspace.gid)).toContain(workspaceGid)
	})

	it('getTagsForWorkspace lists Tags, and getTag returns the first one with the same shape', async () => {
		const tags = new Asana.TagsApi(createClient())

		const page = await tags.getTagsForWorkspace(workspaceGid!, { limit: 5, opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Tag>>()
		for (const tag of page.data) expect(tag.resource_type).toBe('tag')
		const first = page.data[0]
		if (!first) return // a workspace with no tags has nothing for getTag to read
		const res = await tags.getTag(first.gid, { opt_fields: 'name,resource_type,color,workspace.gid' })
		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Tag>>()
		expect(res.data.gid).toBe(first.gid)
		expect(res.data.resource_type).toBe('tag')
		expect(res.data.workspace?.gid).toBe(workspaceGid)
	})
})

describe.skipIf(!projectEnabled || !workspaceEnabled)('asana types: task write operations', () => {
	it('createTask, updateTask and deleteTask resolve to the augmented shapes', async () => {
		const api = new Asana.TasksApi(createClient())

		const created = await api.createTask(
			{ data: { name: 'cyber-asana learn probe: task', workspace: workspaceGid!, projects: [projectGid!] } },
			{ opt_fields: 'name,resource_type,completed' },
		)
		try {
			expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(created.data.resource_type).toBe('task')
			expect(created.data.name).toBe('cyber-asana learn probe: task')
			expect(created.data.completed).toBe(false)

			const updated = await api.updateTask(
				{ data: { name: 'cyber-asana learn probe: renamed', completed: true } },
				created.data.gid,
				{ opt_fields: 'name,completed' },
			)

			expectTypeOf(updated).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(updated.data.gid).toBe(created.data.gid)
			expect(updated.data.name).toBe('cyber-asana learn probe: renamed')
			expect(updated.data.completed).toBe(true)
		} finally {
			const deleted = await api.deleteTask(created.data.gid)

			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
		await expect(api.getTask(created.data.gid)).rejects.toBeDefined()
	})
})

describe.skipIf(!projectEnabled)('asana types: section write operations', () => {
	it('createSectionForProject and deleteSection resolve to the augmented shapes', async () => {
		const api = new Asana.SectionsApi(createClient())

		const created = await api.createSectionForProject(projectGid!, {
			body: { data: { name: 'cyber-asana learn probe: section' } },
			opt_fields: 'name,resource_type',
		})
		try {
			expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Section>>()
			expect(created.data.resource_type).toBe('section')
			expect(created.data.name).toBe('cyber-asana learn probe: section')
		} finally {
			const deleted = await api.deleteSection(created.data.gid)

			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})
})

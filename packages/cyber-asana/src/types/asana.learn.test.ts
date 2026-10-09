import Asana from 'asana'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createClient } from '../platform/client.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'

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

describe.skipIf(!enabled)('asana types: stories', () => {
	it('getStoriesForTask returns a Collection of Stories', async () => {
		const api = new Asana.StoriesApi(createClient())

		const page = await api.getStoriesForTask(taskGid!, {
			limit: 5,
			opt_fields: 'resource_type,type,text,created_at,created_by.name,is_pinned',
		})

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Story>>()
		expect(page.data.length).toBeGreaterThan(0)
		for (const story of page.data) {
			expect(story.resource_type).toBe('story')
			expect(['comment', 'system']).toContain(story.type)
			expect(typeof story.created_at).toBe('string')
		}
	})

	it('createStoryForTask, getStory, updateStory and deleteStory resolve to the augmented shapes', async () => {
		const api = new Asana.StoriesApi(createClient())
		const fields = 'resource_type,type,text,is_pinned,is_edited,is_editable,created_at,created_by.name'

		const created = await api.createStoryForTask({ data: { text: 'cyber-asana learn probe: comment' } }, taskGid!, {
			opt_fields: fields,
		})
		try {
			expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Story>>()
			expect(created.data.resource_type).toBe('story')
			expect(created.data.type).toBe('comment')
			expect(created.data.text).toBe('cyber-asana learn probe: comment')
			expect(created.data.is_pinned).toBe(false)
			expect(typeof created.data.created_by?.gid).toBe('string')

			const got = await api.getStory(created.data.gid, { opt_fields: fields })
			expectTypeOf(got).toEqualTypeOf<Asana.AsanaResponse<Asana.Story>>()
			expect(got.data.gid).toBe(created.data.gid)

			const updated = await api.updateStory({ data: { text: 'cyber-asana learn probe: edited' } }, created.data.gid, {
				opt_fields: fields,
			})
			expectTypeOf(updated).toEqualTypeOf<Asana.AsanaResponse<Asana.Story>>()
			expect(updated.data.text).toBe('cyber-asana learn probe: edited')
			expect(updated.data.is_edited).toBe(true)
		} finally {
			const deleted = await api.deleteStory(created.data.gid)

			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})
})

describe.skipIf(!enabled)('asana types: attachments', () => {
	it('getAttachmentsForObject returns a Collection of Attachments', async () => {
		const api = new Asana.AttachmentsApi(createClient())

		const page = await api.getAttachmentsForObject(taskGid!, { limit: 5, opt_fields: 'name,resource_type' })

		expectTypeOf(page).toEqualTypeOf<Asana.AsanaCollection<Asana.Attachment>>()
		expect(page.data.length).toBeGreaterThan(0)
		for (const attachment of page.data) {
			expect(attachment.resource_type).toBe('attachment')
			expect(typeof attachment.name).toBe('string')
		}
	})

	it('createAttachmentForObject, getAttachment and deleteAttachment resolve to the augmented shapes', async () => {
		const api = new Asana.AttachmentsApi(createClient())
		const fields = 'name,resource_type,resource_subtype,host,created_at,parent.name,permanent_url'

		const created = await api.createAttachmentForObject({
			parent: taskGid!,
			name: 'cyber-asana learn probe: link',
			url: 'https://example.com/learn-probe',
			resource_subtype: 'external',
			opt_fields: fields,
		})
		try {
			expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Attachment>>()
			expect(created.data.resource_type).toBe('attachment')
			expect(created.data.name).toBe('cyber-asana learn probe: link')
			expect(created.data.resource_subtype).toBe('external')
			expect(created.data.parent?.gid).toBe(taskGid)

			const got = await api.getAttachment(created.data.gid, { opt_fields: fields })
			expectTypeOf(got).toEqualTypeOf<Asana.AsanaResponse<Asana.Attachment>>()
			expect(got.data.gid).toBe(created.data.gid)
		} finally {
			const deleted = await api.deleteAttachment(created.data.gid)

			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})
})

describe.skipIf(!projectEnabled || !workspaceEnabled)('asana types: section update, move and add task', () => {
	it('updateSection, insertSectionForProject and addTaskForSection resolve to the augmented shapes', async () => {
		const client = createClient()
		const sections = new Asana.SectionsApi(client)
		const tasks = new Asana.TasksApi(client)
		const createSection = (name: string) =>
			sections.createSectionForProject(projectGid!, { body: { data: { name } }, opt_fields: 'name' })
		const first = await createSection('cyber-asana learn probe: section 1')
		const second = await createSection('cyber-asana learn probe: section 2')
		const task = await tasks.createTask({
			data: { name: 'cyber-asana learn probe: section task', workspace: workspaceGid!, projects: [projectGid!] },
		})
		try {
			const renamed = await sections.updateSection(first.data.gid, {
				body: { data: { name: 'cyber-asana learn probe: renamed' } },
				opt_fields: 'name,resource_type',
			})
			expectTypeOf(renamed).toEqualTypeOf<Asana.AsanaResponse<Asana.Section>>()
			expect(renamed.data.gid).toBe(first.data.gid)
			expect(renamed.data.name).toBe('cyber-asana learn probe: renamed')

			const moved = await sections.insertSectionForProject(projectGid!, {
				body: { data: { section: second.data.gid, before_section: first.data.gid } },
			})
			expectTypeOf(moved).toEqualTypeOf<Asana.EmptyResponse>()
			expect(moved.data).toEqual({})
			const listed = await sections.getSectionsForProject(projectGid!, { opt_fields: 'name' })
			const order = listed.data.map((section) => section.gid)
			expect(order.indexOf(second.data.gid)).toBeLessThan(order.indexOf(first.data.gid))

			const added = await sections.addTaskForSection(second.data.gid, { body: { data: { task: task.data.gid } } })
			expectTypeOf(added).toEqualTypeOf<Asana.EmptyResponse>()
			expect(added.data).toEqual({})
			const read = await tasks.getTask(task.data.gid, { opt_fields: 'memberships.section.gid,memberships.project.gid' })
			expect(read.data.memberships?.map((m) => ({ project: m.project?.gid, section: m.section?.gid }))).toContainEqual({
				project: projectGid,
				section: second.data.gid,
			})
		} finally {
			await tasks.deleteTask(task.data.gid)
			await sections.deleteSection(first.data.gid)
			await sections.deleteSection(second.data.gid)
		}
	})
})

describe.skipIf(!workspaceEnabled)('asana types: ProjectsApi writes, lists, counts and search', () => {
	it('createProject, updateProject, getProjects, getTaskCountsForProject and deleteProject resolve to the augmented shapes', async () => {
		const client = createClient()
		const projects = new Asana.ProjectsApi(client)
		const created = await projects.createProject(
			{ data: { name: 'cyber-asana learn probe: project', workspace: workspaceGid!, notes: 'probe' } },
			{ opt_fields: 'name,notes,resource_type' },
		)
		expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Project>>()
		const gid = created.data.gid
		try {
			expect(created.data.resource_type).toBe('project')
			expect(created.data.notes).toBe('probe')

			const updated = await projects.updateProject({ data: { name: 'cyber-asana learn probe: renamed' } }, gid, {
				opt_fields: 'name',
			})
			expectTypeOf(updated).toEqualTypeOf<Asana.AsanaResponse<Asana.Project>>()
			expect(updated.data.name).toBe('cyber-asana learn probe: renamed')

			const listed = await projects.getProjects({ workspace: workspaceGid!, limit: 1, opt_fields: 'name' })
			expectTypeOf(listed).toEqualTypeOf<Asana.AsanaCollection<Asana.Project>>()
			expect(Array.isArray(listed.data)).toBe(true)

			const counts = await projects.getTaskCountsForProject(gid, {
				opt_fields: 'num_tasks,num_incomplete_tasks,num_completed_tasks',
			})
			expectTypeOf(counts).toEqualTypeOf<Asana.AsanaResponse<Asana.TaskCounts>>()
			expect(counts.data.num_tasks).toBe(0)
		} finally {
			const deleted = await projects.deleteProject(gid)
			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})

	it.skipIf(!isPaidPlan())('searchProjectsForWorkspace returns a Collection of projects (premium only)', async () => {
		const projects = new Asana.ProjectsApi(createClient())
		const found = await projects.searchProjectsForWorkspace(workspaceGid!, { limit: 1, opt_fields: 'name' })
		expectTypeOf(found).toEqualTypeOf<Asana.AsanaCollection<Asana.Project>>()
		expect(Array.isArray(found.data)).toBe(true)
	})
})

describe.skipIf(!projectEnabled || !workspaceEnabled)('asana types: task relations, lists and search', () => {
	it('project, tag, follower, parent, subtask and dependency calls resolve to the augmented shapes', async () => {
		const client = createClient()
		const tasks = new Asana.TasksApi(client)
		const tags = new Asana.TagsApi(client)
		const users = new Asana.UsersApi(client)
		const make = (name: string, extra: object = {}) =>
			tasks.createTask({ data: { name: `cyber-asana learn probe: ${name}`, workspace: workspaceGid!, ...extra } })
		const parent = await make('parent', { projects: [projectGid!] })
		const other = await make('other')
		const tag: { data: { gid: string } } = await tags.createTagForWorkspace(
			{ data: { name: 'cyber-asana learn probe: tag' } },
			workspaceGid!,
		)
		try {
			const me = await users.getUser('me')
			const added = await tasks.addProjectForTask({ data: { project: projectGid! } }, other.data.gid)
			expectTypeOf(added).toEqualTypeOf<Asana.EmptyResponse>()
			expect(added.data).toEqual({})
			const removed = await tasks.removeProjectForTask({ data: { project: projectGid! } }, other.data.gid)
			expectTypeOf(removed).toEqualTypeOf<Asana.EmptyResponse>()
			expect(removed.data).toEqual({})

			const tagged = await tasks.addTagForTask({ data: { tag: tag.data.gid } }, parent.data.gid)
			expectTypeOf(tagged).toEqualTypeOf<Asana.EmptyResponse>()
			expect(tagged.data).toEqual({})
			const byTag = await tasks.getTasksForTag(tag.data.gid, { opt_fields: 'name' })
			expectTypeOf(byTag).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
			expect(byTag.data.map((t) => t.gid)).toContain(parent.data.gid)
			const untagged = await tasks.removeTagForTask({ data: { tag: tag.data.gid } }, parent.data.gid)
			expectTypeOf(untagged).toEqualTypeOf<Asana.EmptyResponse>()
			expect(untagged.data).toEqual({})

			const followed = await tasks.addFollowersForTask({ data: { followers: [me.data.gid] } }, parent.data.gid, {
				opt_fields: 'followers.gid',
			})
			expectTypeOf(followed).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(followed.data.followers?.map((f) => f.gid)).toContain(me.data.gid)
			const unfollowed = await tasks.removeFollowerForTask({ data: { followers: [me.data.gid] } }, parent.data.gid, {
				opt_fields: 'followers.gid',
			})
			expectTypeOf(unfollowed).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(unfollowed.data.followers?.map((f) => f.gid) ?? []).not.toContain(me.data.gid)

			const child = await tasks.createSubtaskForTask(
				{ data: { name: 'cyber-asana learn probe: child' } },
				parent.data.gid,
				{ opt_fields: 'name,parent.gid' },
			)
			expectTypeOf(child).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(child.data.parent?.gid).toBe(parent.data.gid)
			const subtasks = await tasks.getSubtasksForTask(parent.data.gid, { opt_fields: 'name' })
			expectTypeOf(subtasks).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
			expect(subtasks.data.map((t) => t.gid)).toContain(child.data.gid)
			const reparented = await tasks.setParentForTask({ data: { parent: other.data.gid } }, child.data.gid, {
				opt_fields: 'parent.gid',
			})
			expectTypeOf(reparented).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
			expect(reparented.data.parent?.gid).toBe(other.data.gid)
			await tasks.deleteTask(child.data.gid)
		} finally {
			await tasks.deleteTask(parent.data.gid)
			await tasks.deleteTask(other.data.gid)
			await tags.deleteTag(tag.data.gid)
		}
	})

	it.skipIf(!isPaidPlan())('dependency calls resolve to the augmented shapes (paid plans only)', async () => {
		const tasks = new Asana.TasksApi(createClient())
		const make = (name: string) =>
			tasks.createTask({ data: { name: `cyber-asana learn probe: ${name}`, workspace: workspaceGid! } })
		const parent = await make('dependent')
		const other = await make('dependency')
		try {
			const dep = await tasks.addDependenciesForTask({ data: { dependencies: [other.data.gid] } }, parent.data.gid)
			expectTypeOf(dep).toEqualTypeOf<Asana.EmptyResponse>()
			expect(dep.data).toEqual({})
			const dependencies = await tasks.getDependenciesForTask(parent.data.gid, { opt_fields: 'name' })
			expectTypeOf(dependencies).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
			expect(dependencies.data.map((t) => t.gid)).toEqual([other.data.gid])
			const dependents = await tasks.getDependentsForTask(other.data.gid, { opt_fields: 'name' })
			expectTypeOf(dependents).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
			expect(dependents.data.map((t) => t.gid)).toEqual([parent.data.gid])
			const noDep = await tasks.removeDependenciesForTask({ data: { dependencies: [other.data.gid] } }, parent.data.gid)
			expectTypeOf(noDep).toEqualTypeOf<Asana.EmptyResponse>()
			const addDependent = await tasks.addDependentsForTask({ data: { dependents: [other.data.gid] } }, parent.data.gid)
			expectTypeOf(addDependent).toEqualTypeOf<Asana.EmptyResponse>()
			const noDependent = await tasks.removeDependentsForTask(
				{ data: { dependents: [other.data.gid] } },
				parent.data.gid,
			)
			expectTypeOf(noDependent).toEqualTypeOf<Asana.EmptyResponse>()
			expect(noDependent.data).toEqual({})
		} finally {
			await tasks.deleteTask(parent.data.gid)
			await tasks.deleteTask(other.data.gid)
		}
	})

	it('getTasks, getTasksForSection and getTasksForUserTaskList return Collections of tasks', async () => {
		const client = createClient()
		const tasks = new Asana.TasksApi(client)
		const byProject = await tasks.getTasks({ project: projectGid!, limit: 1, opt_fields: 'name' })
		expectTypeOf(byProject).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
		expect(Array.isArray(byProject.data)).toBe(true)

		if (sectionGid) {
			const bySection = await tasks.getTasksForSection(sectionGid, { limit: 1, opt_fields: 'name' })
			expectTypeOf(bySection).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
			expect(Array.isArray(bySection.data)).toBe(true)
		}

		const list = await new Asana.UserTaskListsApi(client).getUserTaskListForUser('me', workspaceGid!)
		const mine = await tasks.getTasksForUserTaskList(list.data.gid, { limit: 1, opt_fields: 'name' })
		expectTypeOf(mine).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
		expect(Array.isArray(mine.data)).toBe(true)
	})

	it.skipIf(!isPaidPlan())('searchTasksForWorkspace returns a Collection of tasks (premium only)', async () => {
		const tasks = new Asana.TasksApi(createClient())
		const found = await tasks.searchTasksForWorkspace(workspaceGid!, { limit: 1, opt_fields: 'name' })
		expectTypeOf(found).toEqualTypeOf<Asana.AsanaCollection<Asana.Task>>()
		expect(Array.isArray(found.data)).toBe(true)
	})
})

describe.skipIf(!workspaceEnabled)('asana types: tag writes, teams, users and user task lists', () => {
	it('createTagForWorkspace, updateTag, getTagsForTask and deleteTag resolve to the augmented shapes', async () => {
		const client = createClient()
		const tags = new Asana.TagsApi(client)
		const tasks = new Asana.TasksApi(client)
		const created = await tags.createTagForWorkspace(
			{ data: { name: 'cyber-asana learn probe: new tag', notes: 'probe' } },
			workspaceGid!,
			{ opt_fields: 'name,notes,resource_type' },
		)
		expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.Tag>>()
		const task = await tasks.createTask({
			data: { name: 'cyber-asana learn probe: tagged', workspace: workspaceGid! },
		})
		try {
			expect(created.data.resource_type).toBe('tag')
			expect(created.data.notes).toBe('probe')

			const updated = await tags.updateTag(
				{ data: { name: 'cyber-asana learn probe: renamed tag' } },
				created.data.gid,
				{
					opt_fields: 'name',
				},
			)
			expectTypeOf(updated).toEqualTypeOf<Asana.AsanaResponse<Asana.Tag>>()
			expect(updated.data.name).toBe('cyber-asana learn probe: renamed tag')

			await tasks.addTagForTask({ data: { tag: created.data.gid } }, task.data.gid)
			const forTask = await tags.getTagsForTask(task.data.gid, { opt_fields: 'name' })
			expectTypeOf(forTask).toEqualTypeOf<Asana.AsanaCollection<Asana.Tag>>()
			expect(forTask.data.map((t) => t.gid)).toEqual([created.data.gid])
		} finally {
			await tasks.deleteTask(task.data.gid)
			const deleted = await tags.deleteTag(created.data.gid)
			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})

	it('getUsers and getUserTaskListForUser resolve to the augmented shapes', async () => {
		const client = createClient()
		const users = await new Asana.UsersApi(client).getUsers({
			workspace: workspaceGid!,
			limit: 1,
			opt_fields: 'name',
		})
		expectTypeOf(users).toEqualTypeOf<Asana.AsanaCollection<Asana.User>>()
		expect(users.data.length).toBeGreaterThan(0)

		const list = await new Asana.UserTaskListsApi(client).getUserTaskListForUser('me', workspaceGid!, {
			opt_fields: 'name,resource_type,owner.gid,workspace.gid',
		})
		expectTypeOf(list).toEqualTypeOf<Asana.AsanaResponse<Asana.UserTaskList>>()
		expect(list.data.resource_type).toBe('user_task_list')
		expect(list.data.workspace?.gid).toBe(workspaceGid)
	})

	it('getTeamsForWorkspace and getTeam resolve to the augmented shapes in an organization', async (ctx) => {
		const client = createClient()
		const workspace = await new Asana.WorkspacesApi(client).getWorkspace(workspaceGid!, {
			opt_fields: 'is_organization',
		})
		if (!workspace.data.is_organization) ctx.skip()
		const api = new Asana.TeamsApi(client)
		const teams = await api.getTeamsForWorkspace(workspaceGid!, { limit: 1, opt_fields: 'name' })
		expectTypeOf(teams).toEqualTypeOf<Asana.AsanaCollection<Asana.Team>>()
		const first = teams.data[0]
		if (!first) ctx.skip()
		const team = await api.getTeam(first.gid, { opt_fields: 'name,resource_type' })
		expectTypeOf(team).toEqualTypeOf<Asana.AsanaResponse<Asana.Team>>()
		expect(team.data.resource_type).toBe('team')
		expect(team.data.gid).toBe(first.gid)
	})
})

describe.skipIf(!projectEnabled)('asana types: memberships and status updates', () => {
	it('getMemberships and getMembership resolve to the augmented shapes', async () => {
		const api = new Asana.MembershipsApi(createClient())
		const listed = await api.getMemberships({ parent: projectGid!, limit: 5, opt_fields: 'resource_type,member.gid' })
		expectTypeOf(listed).toEqualTypeOf<Asana.AsanaCollection<Asana.Membership>>()
		expect(listed.data.length).toBeGreaterThan(0)
		expect(listed.data[0]?.resource_type).toBe('membership')

		const one = await api.getMembership(listed.data[0]!.gid)
		expectTypeOf(one).toEqualTypeOf<Asana.AsanaResponse<Asana.Membership>>()
		expect(one.data.gid).toBe(listed.data[0]!.gid)
	})

	it('createStatusForObject, getStatus, getStatusesForObject and deleteStatus resolve to the augmented shapes', async () => {
		const api = new Asana.StatusUpdatesApi(createClient())
		const created = await api.createStatusForObject(
			{ data: { parent: projectGid!, status_type: 'on_track', title: 'cyber-asana learn probe', text: 'probe' } },
			{ opt_fields: 'title,text,status_type,resource_type,parent.gid' },
		)
		expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.StatusUpdate>>()
		try {
			expect(created.data.resource_type).toBe('status_update')
			expect(created.data.status_type).toBe('on_track')
			expect(created.data.parent?.gid).toBe(projectGid)

			const read = await api.getStatus(created.data.gid, { opt_fields: 'title' })
			expectTypeOf(read).toEqualTypeOf<Asana.AsanaResponse<Asana.StatusUpdate>>()
			expect(read.data.title).toBe('cyber-asana learn probe')

			const listed = await api.getStatusesForObject(projectGid!, { limit: 10, opt_fields: 'title' })
			expectTypeOf(listed).toEqualTypeOf<Asana.AsanaCollection<Asana.StatusUpdate>>()
			expect(listed.data.map((s) => s.gid)).toContain(created.data.gid)
		} finally {
			const deleted = await api.deleteStatus(created.data.gid)
			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})
})

describe.skipIf(!workspaceEnabled || !isPaidPlan())('asana types: OooEntriesApi (paid plans only)', () => {
	it('create, get, list, update and delete resolve to the augmented shapes', async () => {
		const client = createClient()
		const api = new Asana.OooEntriesApi(client)
		const me = await new Asana.UsersApi(client).getUser('me')
		const created = await api.createOooEntry(
			{ data: { user: me.data.gid, workspace: workspaceGid!, start_date: '2099-01-01', end_date: '2099-01-02' } },
			{ opt_fields: 'start_date,end_date,resource_type,user.gid' },
		)
		expectTypeOf(created).toEqualTypeOf<Asana.AsanaResponse<Asana.OooEntry>>()
		try {
			expect(created.data.resource_type).toBe('ooo_entry')
			expect(created.data.end_date).toBe('2099-01-02')

			const updated = await api.updateOooEntry({ data: { end_date: '2099-01-03' } }, created.data.gid, {
				opt_fields: 'end_date',
			})
			expectTypeOf(updated).toEqualTypeOf<Asana.AsanaResponse<Asana.OooEntry>>()
			expect(updated.data.end_date).toBe('2099-01-03')

			const read = await api.getOooEntry(created.data.gid, { opt_fields: 'start_date' })
			expectTypeOf(read).toEqualTypeOf<Asana.AsanaResponse<Asana.OooEntry>>()
			expect(read.data.start_date).toBe('2099-01-01')

			const listed = await api.getOooEntries(me.data.gid, workspaceGid!, { opt_fields: 'start_date' })
			expectTypeOf(listed).toEqualTypeOf<Asana.AsanaCollection<Asana.OooEntry>>()
			expect(listed.data.map((e) => e.gid)).toContain(created.data.gid)
		} finally {
			const deleted = await api.deleteOooEntry(created.data.gid)
			expectTypeOf(deleted).toEqualTypeOf<Asana.EmptyResponse>()
			expect(deleted.data).toEqual({})
		}
	})
})

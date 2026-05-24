import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import Asana from 'asana'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	addDependencies,
	addDependents,
	createSubtask,
	createTask,
	deleteTask,
	getDependencies,
	getDependents,
	getMyTasks,
	getTask,
	listSubtasks,
	listTasks,
	listTasksForSection,
	removeDependencies,
	removeDependents,
	scanTodos,
	searchTasks,
	updateTask,
} from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockTask = { gid: '456', name: 'Test Task' }

describe('tasks/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTasks calls getTasksForProject', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await listTasks('proj1')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: undefined,
			limit: 100,
		})
	})

	it('getTask calls getTask with gid', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTask').mockResolvedValue({ data: mockTask } as never)
		const result = await getTask('456')
		expect(result).toEqual(mockTask)
	})

	it('createTask calls createTask with body', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'createTask').mockResolvedValue({ data: mockTask } as never)
		const result = await createTask('ws1', 'Test Task')
		expect(result).toEqual(mockTask)
		expect(Asana.TasksApi.prototype.createTask).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ name: 'Test Task' }) }),
		)
	})

	it('updateTask calls updateTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'updateTask').mockResolvedValue({
			data: { ...mockTask, completed: true },
		} as never)
		const result = await updateTask('456', { completed: true })
		expect(result).toEqual({ ...mockTask, completed: true })
	})

	it('listSubtasks calls getSubtasksForTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getSubtasksForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await listSubtasks('456')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.TasksApi.prototype.getSubtasksForTask).toHaveBeenCalledWith('456', { limit: 100 })
	})

	it('listSubtasks passes completed_since to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getSubtasksForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		await listSubtasks('456', { completedSince: 'now' })
		expect(Asana.TasksApi.prototype.getSubtasksForTask).toHaveBeenCalledWith('456', {
			completed_since: 'now',
			limit: 100,
		})
	})

	it('listSubtasks omits completed_since when not set', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getSubtasksForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		await listSubtasks('456')
		expect(Asana.TasksApi.prototype.getSubtasksForTask).toHaveBeenCalledWith('456', { limit: 100 })
	})

	it('createSubtask calls createSubtaskForTask with body', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'createSubtaskForTask').mockResolvedValue({
			data: mockTask,
		} as never)
		const result = await createSubtask('parent1', 'Sub Task')
		expect(result).toEqual(mockTask)
		expect(Asana.TasksApi.prototype.createSubtaskForTask).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ name: 'Sub Task' }) }),
			'parent1',
			{},
		)
	})

	it('createSubtask forwards optional fields', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'createSubtaskForTask').mockResolvedValue({
			data: mockTask,
		} as never)
		await createSubtask('parent1', 'Sub Task', { notes: 'note', assignee: 'u1', dueOn: '2026-06-01' })
		expect(Asana.TasksApi.prototype.createSubtaskForTask).toHaveBeenCalledWith(
			{ data: { name: 'Sub Task', notes: 'note', assignee: 'u1', due_on: '2026-06-01' } },
			'parent1',
			{},
		)
	})

	it('deleteTask calls deleteTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'deleteTask').mockResolvedValue(undefined as never)
		await deleteTask('456')
		expect(Asana.TasksApi.prototype.deleteTask).toHaveBeenCalledWith('456')
	})

	it('searchTasks calls searchTasksForWorkspace with text', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await searchTasks('ws1', { text: 'query' })
		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ text: 'query' }),
		)
	})

	it('searchTasks forwards all filter params to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		await searchTasks('ws1', {
			text: 'query',
			completed: true,
			isSubtask: false,
			hasAttachment: true,
			isBlocking: true,
			isBlocked: false,
			assigneeAny: 'u1,u2',
			projectsAny: 'p1',
			sectionsAny: 's1',
			tagsAny: 't1',
			teamsAny: 'tm1',
			resourceSubtype: 'milestone',
			sortBy: 'due_date',
			sortAscending: true,
			optFields: 'gid,name',
		})
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({
				text: 'query',
				completed: true,
				is_subtask: false,
				has_attachment: true,
				is_blocking: true,
				is_blocked: false,
				'assignee.any': 'u1,u2',
				'projects.any': 'p1',
				'sections.any': 's1',
				'tags.any': 't1',
				'teams.any': 'tm1',
				resource_subtype: 'milestone',
				sort_by: 'due_date',
				sort_ascending: true,
				opt_fields: 'gid,name',
			}),
		)
	})

	it('getMyTasks fetches user task list for me then returns tasks', async () => {
		vi.spyOn(Asana.UserTaskListsApi.prototype, 'getUserTaskListForUser').mockResolvedValue({
			data: { gid: 'utl1' },
		} as never)
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForUserTaskList').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await getMyTasks('ws1')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.UserTaskListsApi.prototype.getUserTaskListForUser).toHaveBeenCalledWith('me', 'ws1', {})
		expect(Asana.TasksApi.prototype.getTasksForUserTaskList).toHaveBeenCalledWith('utl1', {
			completed_since: undefined,
			limit: 100,
		})
	})

	it('getMyTasks passes completed_since and pagination options', async () => {
		vi.spyOn(Asana.UserTaskListsApi.prototype, 'getUserTaskListForUser').mockResolvedValue({
			data: { gid: 'utl1' },
		} as never)
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForUserTaskList').mockResolvedValue({
			data: [mockTask],
		} as never)
		await getMyTasks('ws1', { completedSince: '2026-01-01', limit: 25, optFields: 'gid,name' })
		expect(Asana.TasksApi.prototype.getTasksForUserTaskList).toHaveBeenCalledWith('utl1', {
			completed_since: '2026-01-01',
			limit: 25,
			opt_fields: 'gid,name',
		})
	})

	it('searchTasks forwards .not and .all variants to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		await searchTasks('ws1', {
			assigneeNot: 'u3',
			projectsNot: 'p2',
			projectsAll: 'p3,p4',
			sectionsNot: 's2',
			sectionsAll: 's3',
			tagsNot: 't2',
			tagsAll: 't3',
		})
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({
				'assignee.not': 'u3',
				'projects.not': 'p2',
				'projects.all': 'p3,p4',
				'sections.not': 's2',
				'sections.all': 's3',
				'tags.not': 't2',
				'tags.all': 't3',
			}),
		)
	})

	it('searchTasks forwards portfolio and user interaction filters to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		await searchTasks('ws1', {
			portfoliosAny: 'pf1',
			followersAny: 'u1',
			followersNot: 'u2',
			createdByAny: 'u3',
			createdByNot: 'u4',
			assignedByAny: 'u5',
			assignedByNot: 'u6',
			likedByNot: 'u7',
			commentedOnByNot: 'u8',
		})
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({
				'portfolios.any': 'pf1',
				'followers.any': 'u1',
				'followers.not': 'u2',
				'created_by.any': 'u3',
				'created_by.not': 'u4',
				'assigned_by.any': 'u5',
				'assigned_by.not': 'u6',
				'liked_by.not': 'u7',
				'commented_on_by.not': 'u8',
			}),
		)
	})

	it('searchTasks forwards date range filters to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		await searchTasks('ws1', {
			dueOn: '2026-06-01',
			dueOnBefore: '2026-07-01',
			dueOnAfter: '2026-05-01',
			dueAtBefore: '2026-07-01T00:00:00Z',
			dueAtAfter: '2026-05-01T00:00:00Z',
			startOn: '2026-05-01',
			startOnBefore: '2026-06-01',
			startOnAfter: '2026-04-01',
			createdOn: '2026-01-01',
			createdOnBefore: '2026-02-01',
			createdOnAfter: '2025-12-01',
			createdAtBefore: '2026-02-01T00:00:00Z',
			createdAtAfter: '2025-12-01T00:00:00Z',
			completedOn: '2026-03-01',
			completedOnBefore: '2026-04-01',
			completedOnAfter: '2026-02-01',
			completedAtBefore: '2026-04-01T00:00:00Z',
			completedAtAfter: '2026-02-01T00:00:00Z',
			modifiedOn: '2026-05-01',
			modifiedOnBefore: '2026-05-15',
			modifiedOnAfter: '2026-04-15',
			modifiedAtBefore: '2026-05-15T00:00:00Z',
			modifiedAtAfter: '2026-04-15T00:00:00Z',
		})
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({
				due_on: '2026-06-01',
				'due_on.before': '2026-07-01',
				'due_on.after': '2026-05-01',
				'due_at.before': '2026-07-01T00:00:00Z',
				'due_at.after': '2026-05-01T00:00:00Z',
				start_on: '2026-05-01',
				'start_on.before': '2026-06-01',
				'start_on.after': '2026-04-01',
				created_on: '2026-01-01',
				'created_on.before': '2026-02-01',
				'created_on.after': '2025-12-01',
				'created_at.before': '2026-02-01T00:00:00Z',
				'created_at.after': '2025-12-01T00:00:00Z',
				completed_on: '2026-03-01',
				'completed_on.before': '2026-04-01',
				'completed_on.after': '2026-02-01',
				'completed_at.before': '2026-04-01T00:00:00Z',
				'completed_at.after': '2026-02-01T00:00:00Z',
				modified_on: '2026-05-01',
				'modified_on.before': '2026-05-15',
				'modified_on.after': '2026-04-15',
				'modified_at.before': '2026-05-15T00:00:00Z',
				'modified_at.after': '2026-04-15T00:00:00Z',
			}),
		)
	})

	it('listTasks passes completed_since to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
		} as never)
		await listTasks('proj1', { completedSince: '2024-01-01' })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: '2024-01-01',
			limit: 100,
		})
	})

	it('listTasks forwards pagination options and returns next page metadata', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
			_response: { next_page: { offset: 'next-offset' } },
		} as never)

		const result = await listTasks('proj1', {
			completedSince: 'now',
			limit: 25,
			offset: 'current-offset',
			optFields: 'gid,name',
		} as never)

		expect(result).toEqual({ data: [mockTask], next_page: { offset: 'next-offset' }, limit: 25 })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: 'now',
			limit: 25,
			offset: 'current-offset',
			opt_fields: 'gid,name',
		})
	})

	it('listTasks fetches all pages up to max_pages', async () => {
		const nextPage = vi.fn().mockResolvedValue({
			data: [{ gid: '789', name: 'Next Task' }],
			_response: { next_page: { offset: 'third-offset' } },
			nextPage: vi.fn(),
		})
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
			_response: { next_page: { offset: 'second-offset' } },
			nextPage,
		} as never)

		const result = await listTasks('proj1', { fetchAll: true, maxPages: 2 })

		expect(result).toEqual({
			data: [mockTask, { gid: '789', name: 'Next Task' }],
			next_page: { offset: 'third-offset' },
			limit: 100,
			page_count: 2,
			truncated: true,
		})
		expect(nextPage).toHaveBeenCalledTimes(1)
	})

	it('listTasksForSection calls getTasksForSection', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForSection').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await listTasksForSection('sec1')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.TasksApi.prototype.getTasksForSection).toHaveBeenCalledWith('sec1', {
			completed_since: undefined,
			limit: 100,
		})
	})

	it('getDependencies calls getDependenciesForTask with default opt_fields', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getDependenciesForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await getDependencies('456')
		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.getDependenciesForTask).toHaveBeenCalledWith('456', {
			opt_fields: 'gid,name,completed,due_on',
		})
	})

	it('getDependencies passes custom opt_fields when provided', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getDependenciesForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		await getDependencies('456', { optFields: 'gid,name' })
		expect(Asana.TasksApi.prototype.getDependenciesForTask).toHaveBeenCalledWith('456', {
			opt_fields: 'gid,name',
		})
	})

	it('getDependents calls getDependentsForTask with default opt_fields', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getDependentsForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await getDependents('456')
		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.getDependentsForTask).toHaveBeenCalledWith('456', {
			opt_fields: 'gid,name,completed,due_on',
		})
	})

	it('getDependents passes custom opt_fields when provided', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getDependentsForTask').mockResolvedValue({
			data: [mockTask],
		} as never)
		await getDependents('456', { optFields: 'gid,name' })
		expect(Asana.TasksApi.prototype.getDependentsForTask).toHaveBeenCalledWith('456', {
			opt_fields: 'gid,name',
		})
	})

	it('addDependencies returns the API response', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'addDependenciesForTask').mockResolvedValue({} as never)
		const result = await addDependencies('456', ['111', '222'])
		expect(result).toEqual({})
		expect(Asana.TasksApi.prototype.addDependenciesForTask).toHaveBeenCalledWith(
			{ data: { dependencies: [{ gid: '111' }, { gid: '222' }] } },
			'456',
		)
	})

	it('addDependents returns the API response', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'addDependentsForTask').mockResolvedValue({} as never)
		const result = await addDependents('456', ['333', '444'])
		expect(result).toEqual({})
		expect(Asana.TasksApi.prototype.addDependentsForTask).toHaveBeenCalledWith(
			{ data: { dependents: [{ gid: '333' }, { gid: '444' }] } },
			'456',
		)
	})

	it('removeDependencies calls removeDependenciesForTask with wrapped gids', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'removeDependenciesForTask').mockResolvedValue(undefined as never)
		await removeDependencies('456', ['111'])
		expect(Asana.TasksApi.prototype.removeDependenciesForTask).toHaveBeenCalledWith(
			{ data: { dependencies: [{ gid: '111' }] } },
			'456',
		)
	})

	it('removeDependents calls removeDependentsForTask with wrapped gids', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'removeDependentsForTask').mockResolvedValue(undefined as never)
		await removeDependents('456', ['333'])
		expect(Asana.TasksApi.prototype.removeDependentsForTask).toHaveBeenCalledWith(
			{ data: { dependents: [{ gid: '333' }] } },
			'456',
		)
	})
})

describe('scanTodos', () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = path.join(tmpdir(), `scan-todos-test-${Date.now()}`)
		await mkdir(tmpDir, { recursive: true })
	})

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true })
	})

	it('finds TODO and FIXME comments', async () => {
		await writeFile(path.join(tmpDir, 'foo.ts'), '// TODO: fix this\nconst x = 1\n// FIXME: broken\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(2)
		expect(results[0]).toMatchObject({ line: 1, pattern: 'TODO', text: 'fix this' })
		expect(results[1]).toMatchObject({ line: 3, pattern: 'FIXME', text: 'broken' })
	})

	it('returns relative file paths', async () => {
		await writeFile(path.join(tmpDir, 'bar.ts'), '// TODO: relative path test\n')
		const results = await scanTodos(tmpDir)
		expect(results[0]?.file).toBe('bar.ts')
	})

	it('skips excluded directories', async () => {
		const nodeModules = path.join(tmpDir, 'node_modules')
		await mkdir(nodeModules)
		await writeFile(path.join(nodeModules, 'lib.ts'), '// TODO: should be skipped\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(0)
	})

	it('skips files with non-matching extensions', async () => {
		await writeFile(path.join(tmpDir, 'readme.md'), '<!-- TODO: ignored -->\n')
		const results = await scanTodos(tmpDir, { extensions: ['.ts'] })
		expect(results).toHaveLength(0)
	})

	it('returns empty array when no matches found', async () => {
		await writeFile(path.join(tmpDir, 'clean.ts'), 'const x = 1\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(0)
	})
})

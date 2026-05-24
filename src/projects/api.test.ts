import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	createProject,
	createProjectApi,
	deleteProject,
	exportProject,
	getProject,
	getProjectTaskCounts,
	listProjects,
	renderProjectMarkdown,
	searchProjects,
	updateProject,
} from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockData = { gid: '123', name: 'Test Project' }

describe('projects/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listProjects calls getProjectsForWorkspace', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProjectsForWorkspace').mockResolvedValue({
			data: [mockData],
		} as never)
		const result = await listProjects('ws1')
		expect(result).toEqual({ data: [mockData], next_page: null, limit: 100 })
		expect(Asana.ProjectsApi.prototype.getProjectsForWorkspace).toHaveBeenCalledWith('ws1', {
			archived: undefined,
			limit: 100,
		})
	})

	it('listProjects forwards pagination options and returns next page metadata', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProjectsForWorkspace').mockResolvedValue({
			data: [mockData],
			_response: { next_page: { offset: 'next-offset' } },
		} as never)

		const result = await listProjects('ws1', {
			limit: 50,
			offset: 'current-offset',
			optFields: 'gid,name',
		} as never)

		expect(result).toEqual({ data: [mockData], next_page: { offset: 'next-offset' }, limit: 50 })
		expect(Asana.ProjectsApi.prototype.getProjectsForWorkspace).toHaveBeenCalledWith('ws1', {
			limit: 50,
			offset: 'current-offset',
			opt_fields: 'gid,name',
		})
	})

	it('getProject calls getProject with gid', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProject').mockResolvedValue({
			data: mockData,
		} as never)
		const result = await getProject('123')
		expect(result).toEqual(mockData)
	})

	it('getProjectTaskCounts uses default count fields', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getTaskCountsForProject').mockResolvedValue({
			data: { num_tasks: 12, num_incomplete_tasks: 5, num_completed_tasks: 7 },
		} as never)

		const result = await getProjectTaskCounts('123')

		expect(result).toEqual({ num_tasks: 12, num_incomplete_tasks: 5, num_completed_tasks: 7 })
		expect(Asana.ProjectsApi.prototype.getTaskCountsForProject).toHaveBeenCalledWith('123', {
			opt_fields: 'num_tasks,num_incomplete_tasks,num_completed_tasks',
		})
	})

	it('getProjectTaskCounts forwards custom optFields', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getTaskCountsForProject').mockResolvedValue({
			data: { num_milestones: 3 },
		} as never)

		const result = await getProjectTaskCounts('123', { optFields: 'num_milestones' })

		expect(result).toEqual({ num_milestones: 3 })
		expect(Asana.ProjectsApi.prototype.getTaskCountsForProject).toHaveBeenCalledWith('123', {
			opt_fields: 'num_milestones',
		})
	})

	it('createProject calls createProject with body', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'createProject').mockResolvedValue({
			data: mockData,
		} as never)
		const result = await createProject('ws1', 'Test Project')
		expect(result).toEqual(mockData)
		expect(Asana.ProjectsApi.prototype.createProject).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ name: 'Test Project' }) }),
		)
	})

	it('createProject forwards html notes, privacy, default view, and dates', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'createProject').mockResolvedValue({
			data: mockData,
		} as never)

		await createProject('ws1', 'Test Project', {
			html_notes: '<body>Hi</body>',
			privacy_setting: 'private',
			default_view: 'timeline',
			due_on: '2026-06-10',
			start_on: '2026-06-01',
		})

		expect(Asana.ProjectsApi.prototype.createProject).toHaveBeenCalledWith({
			data: {
				name: 'Test Project',
				workspace: 'ws1',
				html_notes: '<body>Hi</body>',
				privacy_setting: 'private',
				default_view: 'timeline',
				due_on: '2026-06-10',
				start_on: '2026-06-01',
			},
		})
	})

	it('updateProject calls updateProject with fields', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'updateProject').mockResolvedValue({
			data: { ...mockData, name: 'Updated' },
		} as never)
		const result = await updateProject('123', { name: 'Updated' })
		expect(result).toEqual({ ...mockData, name: 'Updated' })
	})

	it('updateProject forwards html notes, privacy, default view, and nullable dates', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'updateProject').mockResolvedValue({
			data: { ...mockData, name: 'Updated' },
		} as never)

		await updateProject('123', {
			html_notes: '<body>Updated</body>',
			privacy_setting: 'public_to_workspace',
			default_view: 'calendar',
			due_on: '2026-06-10',
			start_on: null,
		})

		expect(Asana.ProjectsApi.prototype.updateProject).toHaveBeenCalledWith(
			{
				data: {
					html_notes: '<body>Updated</body>',
					privacy_setting: 'public_to_workspace',
					default_view: 'calendar',
					due_on: '2026-06-10',
					start_on: null,
				},
			},
			'123',
			{},
		)
	})

	it('deleteProject calls deleteProject with gid', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'deleteProject').mockResolvedValue(undefined as never)
		await deleteProject('123')
		expect(Asana.ProjectsApi.prototype.deleteProject).toHaveBeenCalledWith('123')
	})

	it('searchProjects calls searchProjectsForWorkspace with text', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'searchProjectsForWorkspace').mockResolvedValue({
			data: [mockData],
		} as never)
		const result = await searchProjects('ws1', { text: 'roadmap' })
		expect(result).toEqual([mockData])
		expect(Asana.ProjectsApi.prototype.searchProjectsForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ text: 'roadmap' }),
		)
	})

	it('searchProjects forwards full project search filters to SDK', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'searchProjectsForWorkspace').mockResolvedValue({
			data: [mockData],
		} as never)

		await searchProjects('ws1', {
			text: 'launch',
			completed: false,
			teamsAny: 'team1',
			ownerAny: 'me',
			membersAny: 'user1,user2',
			membersNot: 'user3',
			portfoliosAny: 'port1',
			completedOn: '2026-05-01',
			completedOnBefore: '2026-05-31',
			completedOnAfter: '2026-05-02',
			completedAtBefore: '2026-05-31T10:00:00Z',
			completedAtAfter: '2026-05-01T10:00:00Z',
			createdOn: '2026-04-01',
			createdOnBefore: '2026-04-30',
			createdOnAfter: '2026-04-02',
			createdAtBefore: '2026-04-30T10:00:00Z',
			createdAtAfter: '2026-04-01T10:00:00Z',
			dueOn: '2026-06-01',
			dueOnBefore: '2026-06-30',
			dueOnAfter: '2026-06-02',
			dueAtBefore: '2026-06-30T10:00:00Z',
			dueAtAfter: '2026-06-01T10:00:00Z',
			startOn: '2026-03-01',
			startOnBefore: '2026-03-31',
			startOnAfter: '2026-03-02',
			sortBy: 'due_date',
			sortAscending: true,
			optFields: 'gid,name,owner',
		})

		expect(Asana.ProjectsApi.prototype.searchProjectsForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({
				text: 'launch',
				completed: false,
				'teams.any': 'team1',
				'owner.any': 'me',
				'members.any': 'user1,user2',
				'members.not': 'user3',
				'portfolios.any': 'port1',
				completed_on: '2026-05-01',
				'completed_on.before': '2026-05-31',
				'completed_on.after': '2026-05-02',
				'completed_at.before': '2026-05-31T10:00:00Z',
				'completed_at.after': '2026-05-01T10:00:00Z',
				created_on: '2026-04-01',
				'created_on.before': '2026-04-30',
				'created_on.after': '2026-04-02',
				'created_at.before': '2026-04-30T10:00:00Z',
				'created_at.after': '2026-04-01T10:00:00Z',
				due_on: '2026-06-01',
				'due_on.before': '2026-06-30',
				'due_on.after': '2026-06-02',
				'due_at.before': '2026-06-30T10:00:00Z',
				'due_at.after': '2026-06-01T10:00:00Z',
				start_on: '2026-03-01',
				'start_on.before': '2026-03-31',
				'start_on.after': '2026-03-02',
				sort_by: 'due_date',
				sort_ascending: true,
				opt_fields: 'gid,name,owner',
			}),
		)
	})
})

describe('renderProjectMarkdown', () => {
	it('renders project name as h1', () => {
		const md = renderProjectMarkdown({ gid: '1', name: 'My Project', notes: '', sections: [] })
		expect(md).toContain('# My Project')
	})

	it('renders notes as blockquote when present', () => {
		const md = renderProjectMarkdown({ gid: '1', name: 'P', notes: 'Some notes', sections: [] })
		expect(md).toContain('> Some notes')
	})

	it('omits blockquote when notes is empty', () => {
		const md = renderProjectMarkdown({ gid: '1', name: 'P', notes: '', sections: [] })
		expect(md).not.toContain('>')
	})

	it('renders sections as h2 with tasks', () => {
		const md = renderProjectMarkdown({
			gid: '1',
			name: 'P',
			notes: '',
			sections: [
				{
					gid: 's1',
					name: 'Sprint 1',
					tasks: [
						{
							gid: 't1',
							name: 'Task A',
							completed: false,
							due_on: '2024-06-01',
							assignee: { name: 'Alice' },
							notes: '',
						},
						{ gid: 't2', name: 'Task B', completed: true, due_on: null, assignee: null, notes: '' },
					],
				},
			],
		})
		expect(md).toContain('## Sprint 1')
		expect(md).toContain('- [ ] Task A — Alice — due 2024-06-01')
		expect(md).toContain('- [x] Task B')
	})

	it('renders (no tasks) for empty sections', () => {
		const md = renderProjectMarkdown({
			gid: '1',
			name: 'P',
			notes: '',
			sections: [{ gid: 's1', name: 'Empty', tasks: [] }],
		})
		expect(md).toContain('_(no tasks)_')
	})
})

describe('exportProject', () => {
	afterEach(() => vi.restoreAllMocks())

	it('fetches project, sections, and tasks per section', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProject').mockResolvedValue({
			data: { gid: '123', name: 'Test Project', notes: '' },
		} as never)
		vi.spyOn(Asana.SectionsApi.prototype, 'getSectionsForProject').mockResolvedValue({
			data: [{ gid: 's1', name: 'Section 1' }],
		} as never)
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForSection').mockResolvedValue({
			data: [{ gid: 't1', name: 'Task 1', completed: false, due_on: null, assignee: null, notes: '' }],
		} as never)
		const result = await exportProject('123')
		expect(result.name).toBe('Test Project')
		expect(result.sections).toHaveLength(1)
		expect(result.sections[0]?.tasks).toHaveLength(1)
	})
})

describe('createProjectApi', () => {
	it('uses the provided gateway for listProjects', async () => {
		const mockListProjects = vi.fn().mockResolvedValue({ data: [mockData], next_page: null, limit: 100 })
		const api = createProjectApi({
			listProjects: mockListProjects,
			getProject: vi.fn(),
			getProjectTaskCounts: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			searchProjects: vi.fn(),
			listSections: vi.fn(),
			listTasksForSection: vi.fn(),
		})

		const result = await api.listProjects('ws1')

		expect(result).toEqual({ data: [mockData], next_page: null, limit: 100 })
		expect(mockListProjects).toHaveBeenCalledWith('ws1', undefined)
	})
})

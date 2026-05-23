import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	createProject,
	deleteProject,
	exportProject,
	getProject,
	listProjects,
	renderProjectMarkdown,
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
		expect(result).toEqual([mockData])
		expect(Asana.ProjectsApi.prototype.getProjectsForWorkspace).toHaveBeenCalledWith('ws1', {})
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

		expect(result).toEqual({ data: [mockData], next_page: { offset: 'next-offset' } })
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

	it('updateProject calls updateProject with fields', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'updateProject').mockResolvedValue({
			data: { ...mockData, name: 'Updated' },
		} as never)
		const result = await updateProject('123', { name: 'Updated' })
		expect(result).toEqual({ ...mockData, name: 'Updated' })
	})

	it('deleteProject calls deleteProject with gid', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'deleteProject').mockResolvedValue(undefined as never)
		await deleteProject('123')
		expect(Asana.ProjectsApi.prototype.deleteProject).toHaveBeenCalledWith('123')
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

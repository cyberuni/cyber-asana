import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject, deleteProject, getProject, listProjects, updateProject } from './api.js'

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

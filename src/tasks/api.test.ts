import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTask, deleteTask, getTask, listTasks, searchTasks, updateTask } from './api.js'

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
		expect(result).toEqual([mockTask])
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

	it('deleteTask calls deleteTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'deleteTask').mockResolvedValue(undefined as never)
		await deleteTask('456')
		expect(Asana.TasksApi.prototype.deleteTask).toHaveBeenCalledWith('456')
	})

	it('searchTasks calls searchTasksForWorkspace with text', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await searchTasks('ws1', 'query')
		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith('ws1', { text: 'query' })
	})
})

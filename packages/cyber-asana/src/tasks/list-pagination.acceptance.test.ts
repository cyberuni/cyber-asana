import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createTaskApi } from './api.js'
import type { TaskGateway } from './gateway.js'
import { defineTaskListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const projectGid = 'proj-test'
const pages = [[{ gid: 'task1', name: 'Alpha' }], [{ gid: 'task2', name: 'Beta' }], [{ gid: 'task3', name: 'Gamma' }]]

function createPaginatingTaskGateway(): TaskGateway {
	return {
		listTasks: createPaginatingScopedListMock(pages),
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
	}
}

describe(
	'tasks/list pagination acceptance',
	defineTaskListPaginationAcceptanceSpecs({
		getApi: () => createTaskApi(createPaginatingTaskGateway()),
		projectGid,
	}),
)

describe('tasks/list pagination acceptance gateway double', () => {
	it('exercises listTasks without importing the Asana SDK', async () => {
		const gateway = createPaginatingTaskGateway()
		const api = createTaskApi(gateway)

		const result = await api.listTasks(projectGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'task1', name: 'Alpha' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listTasks).toHaveBeenCalledWith(projectGid, { limit: 25 })
	})
})

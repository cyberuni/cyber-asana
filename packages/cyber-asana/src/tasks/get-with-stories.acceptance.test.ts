import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createTaskApi } from './api.js'
import type { TaskGateway } from './gateway.js'
import { defineGetWithStoriesAcceptanceSpecs } from './get-with-stories.acceptance.js'

const taskGid = '456'
const task = { gid: taskGid, name: 'Task with history' }
// Twelve pages of one story each: more than the default page cap, so a capped fetch would lose stories.
const storyPages = Array.from({ length: 12 }, (_, i) => [
	{
		gid: `story${i + 1}`,
		type: 'comment',
		text: `Comment ${i + 1}`,
		created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
	},
])

function createStoryTaskGateway(): TaskGateway {
	return {
		listTasks: vi.fn(),
		listTasksForSection: vi.fn(),
		getTask: vi.fn(async (gid: string) => {
			if (gid !== taskGid) throw new Error(`task not found: ${gid}`)
			return task
		}),
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
		listStories: createPaginatingScopedListMock(storyPages),
	}
}

describe(
	'tasks/get with stories acceptance',
	defineGetWithStoriesAcceptanceSpecs({
		getApi: () => createTaskApi(createStoryTaskGateway()),
		taskGid,
		expectedStoryCount: storyPages.length,
	}),
)

describe('tasks/get with stories acceptance gateway double', () => {
	it('exercises getTask and listStories without importing the Asana SDK', async () => {
		const gateway = createStoryTaskGateway()
		const api = createTaskApi(gateway)

		await api.getTaskWithStories(taskGid, { optFields: 'gid,name' })

		expect(gateway.getTask).toHaveBeenCalledWith(taskGid, { optFields: 'gid,name' })
		expect(gateway.listStories).toHaveBeenCalledWith(taskGid, expect.objectContaining({ fetchAll: true }))
	})

	it('validates --since before sending any request', async () => {
		const gateway = createStoryTaskGateway()

		await expect(createTaskApi(gateway).getTaskWithStories(taskGid, { since: 'not-a-time' })).rejects.toThrow()

		expect(gateway.getTask).not.toHaveBeenCalled()
		expect(gateway.listStories).not.toHaveBeenCalled()
	})
})

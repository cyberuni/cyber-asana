import { describe, expect, it, vi } from 'vitest'
import { createTaskApi } from './api.js'
import { defineBatchLookupAcceptanceSpecs } from './batch-lookup.acceptance.js'
import type { TaskGateway } from './gateway.js'

const primaryTask = {
	gid: '456',
	name: 'First Task',
	completed: false,
	due_on: '2026-06-01',
	assignee: { gid: 'user1', name: 'Alice' },
	permalink_url: 'https://app.asana.com/0/456',
	resource_subtype: 'default_task',
}

const secondaryTask = {
	gid: '789',
	name: 'Second Task',
	completed: true,
	due_on: null,
	assignee: null,
	permalink_url: 'https://app.asana.com/0/789',
	resource_subtype: 'default_task',
}

function createBatchLookupGateway(): TaskGateway {
	const tasks: Record<string, Record<string, unknown>> = {
		'456': primaryTask,
		'789': secondaryTask,
	}

	return {
		listTasks: vi.fn(),
		listTasksForSection: vi.fn(),
		getTask: vi.fn(async (taskGid: string) => {
			const task = tasks[taskGid]
			if (!task) throw new Error(`task not found: ${taskGid}`)
			return task
		}),
		getTasksByGid: vi.fn(async (taskGids: string[], opts?: { optFields?: string }) =>
			taskGids.map((gid: string) => {
				if (gid === '0') {
					return { gid, ok: false as const, status: 404, errors: [{ message: 'Not Found' }] }
				}
				const task = tasks[gid]
				if (!task) {
					return { gid, ok: false as const, status: 404, errors: [{ message: 'Not Found' }] }
				}
				if (opts?.optFields) {
					const fields = opts.optFields.split(',')
					const filtered = Object.fromEntries(fields.map((field: string) => [field, task[field]]))
					return { gid, ok: true as const, task: filtered }
				}
				return { gid, ok: true as const, task }
			}),
		),
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
	'tasks/batch lookup acceptance',
	defineBatchLookupAcceptanceSpecs({
		getApi: () => createTaskApi(createBatchLookupGateway()),
		primaryTaskGid: '456',
		secondaryTaskGid: '789',
		invalidTaskGid: '0',
	}),
)

describe('tasks/batch lookup acceptance gateway double', () => {
	it('exercises getTasksByGid without importing the Asana SDK', async () => {
		const gateway = createBatchLookupGateway()
		const api = createTaskApi(gateway)

		const result = await api.getTasksByGid(['456', '0'])

		expect(result).toEqual([
			{ gid: '456', ok: true, task: primaryTask },
			{ gid: '0', ok: false, status: 404, errors: [{ message: 'Not Found' }] },
		])
		expect(gateway.getTasksByGid).toHaveBeenCalledWith(['456', '0'], undefined)
	})
})

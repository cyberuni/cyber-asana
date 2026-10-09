import { describe, vi } from 'vitest'
import { createTaskApi } from './api.js'
import type { CreateTaskFields, TaskGateway, UpdateTaskFields } from './gateway.js'
import { defineTaskWriteAcceptanceSpecs } from './write-operations.acceptance.js'

/** Keeps tasks in memory; reading a deleted task rejects the way Asana's 404 does. */
function createWritableGateway(): TaskGateway {
	const tasks = new Map<string, Record<string, unknown>>()
	let next = 1
	return {
		createTask: vi.fn(async (_workspaceGid: string, name: string, opts?: CreateTaskFields) => {
			const gid = String(next++)
			tasks.set(gid, { gid, name, notes: opts?.notes ?? '', completed: opts?.completed ?? false })
			return { gid, name }
		}),
		getTask: vi.fn(async (taskGid: string) => {
			const task = tasks.get(taskGid)
			if (!task) throw new Error(`task not found: ${taskGid}`)
			return task
		}),
		updateTask: vi.fn(async (taskGid: string, fields: UpdateTaskFields) => {
			const task = tasks.get(taskGid)
			if (!task) throw new Error(`task not found: ${taskGid}`)
			Object.assign(task, fields)
			return task
		}),
		deleteTask: vi.fn(async (taskGid: string) => {
			tasks.delete(taskGid)
		}),
	} as unknown as TaskGateway
}

describe(
	'tasks/write operations acceptance',
	defineTaskWriteAcceptanceSpecs({
		getApi: () => createTaskApi(createWritableGateway()),
		workspaceGid: 'ws1',
		projectGid: '999',
	}),
)

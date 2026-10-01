import { describe, vi } from 'vitest'
import { createTaskApi } from './api.js'
import { defineCreateInSectionAcceptanceSpecs } from './create-in-section.acceptance.js'
import type { CreateTaskFields, TaskGateway } from './gateway.js'

/** Keeps created tasks in memory, expanding each membership the way Asana returns it. */
function createSectionGateway(): TaskGateway {
	const tasks = new Map<string, Record<string, unknown>>()
	let next = 1
	return {
		createTask: vi.fn(async (_workspaceGid: string, name: string, opts?: CreateTaskFields) => {
			const gid = String(next++)
			const memberships = (opts?.memberships ?? []).map((m) => ({
				project: { gid: m.project },
				section: { gid: m.section },
			}))
			tasks.set(gid, { gid, name, memberships })
			return { gid, name }
		}),
		getTask: vi.fn(async (taskGid: string) => {
			const task = tasks.get(taskGid)
			if (!task) throw new Error(`task not found: ${taskGid}`)
			return task
		}),
		deleteTask: vi.fn(async (taskGid: string) => {
			tasks.delete(taskGid)
		}),
	} as unknown as TaskGateway
}

describe(
	'tasks/create in section acceptance',
	defineCreateInSectionAcceptanceSpecs({
		getApi: () => createTaskApi(createSectionGateway()),
		workspaceGid: 'ws1',
		projectGid: '999',
		sectionGid: '800',
	}),
)

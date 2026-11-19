import { describe, expect, it, vi } from 'vitest'
import { createTaskApi } from './api.js'
import type { TaskGateway, UpdateTaskFields } from './gateway.js'
import { defineSubtaskPositionAcceptanceSpecs } from './subtask-position.acceptance.js'

/**
 * Keeps each parent's subtasks in order, placing a task the way `setParent` does: before or after the
 * named sibling, or first when no position is given (what Asana does, per issue 405).
 */
function createSubtaskGateway(): TaskGateway {
	const parents = new Map<string, string | undefined>()
	const children = new Map<string, string[]>()
	let next = 1
	const setParent = (gid: string, fields: UpdateTaskFields) => {
		const old = parents.get(gid)
		if (old)
			children.set(
				old,
				(children.get(old) ?? []).filter((child) => child !== gid),
			)
		const parent = fields.clear_parent ? undefined : fields.parent
		parents.set(gid, parent)
		if (!parent) return
		const list = children.get(parent) ?? []
		const anchor = fields.insert_before ?? fields.insert_after
		const index = anchor === undefined ? 0 : list.indexOf(anchor)
		if (index < 0) throw new Error(`${anchor} is not a subtask of ${parent}`)
		list.splice(fields.insert_after !== undefined ? index + 1 : index, 0, gid)
		children.set(parent, list)
	}
	return {
		createTask: vi.fn(async (_workspaceGid: string, name: string) => {
			const gid = String(next++)
			parents.set(gid, undefined)
			return { gid, name }
		}),
		getTask: vi.fn(async (gid: string) => {
			const parent = parents.get(gid)
			return { gid, parent: parent ? { gid: parent } : null }
		}),
		updateTask: vi.fn(async (gid: string, fields: UpdateTaskFields) => {
			if (fields.parent !== undefined || fields.clear_parent) setParent(gid, fields)
			return { gid }
		}),
		listSubtasks: vi.fn(async (gid: string) => ({
			data: (children.get(gid) ?? []).map((child) => ({ gid: child })),
			next_page: null,
			limit: 100,
		})),
		deleteTask: vi.fn(async (gid: string) => {
			parents.delete(gid)
		}),
	} as unknown as TaskGateway
}

describe(
	'tasks/subtask position acceptance',
	defineSubtaskPositionAcceptanceSpecs({ getApi: () => createTaskApi(createSubtaskGateway()), workspaceGid: 'ws1' }),
)

describe('tasks/reorderSubtask', () => {
	it('rejects a task with no parent', async () => {
		const api = createTaskApi(createSubtaskGateway())
		const task = await api.createTask('ws1', 'orphan')
		await expect(api.reorderSubtask(task.gid, { insertAfter: '9' })).rejects.toThrow(
			`task ${task.gid} has no parent; set one with \`task update --parent\``,
		)
	})

	it('needs exactly one of insertBefore and insertAfter', async () => {
		const api = createTaskApi(createSubtaskGateway())
		await expect(api.reorderSubtask('1', {})).rejects.toThrow('give one of --insert-before or --insert-after')
		await expect(api.reorderSubtask('1', { insertBefore: '2', insertAfter: '3' })).rejects.toThrow(
			'--insert-before and --insert-after are mutually exclusive',
		)
	})
})

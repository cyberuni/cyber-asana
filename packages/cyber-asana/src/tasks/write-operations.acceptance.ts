import { expect, it } from 'vitest'
import type { TaskApi } from './api.js'

export type TaskWriteAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'createTask' | 'getTask' | 'updateTask' | 'deleteTask'>
	workspaceGid: string
	projectGid: string
}

export function defineTaskWriteAcceptanceSpecs(deps: TaskWriteAcceptanceDeps) {
	return () => {
		it('creates a task in the project and reads it back', async () => {
			const api = deps.getApi()
			const created = await api.createTask(deps.workspaceGid, 'cyber-asana write probe: create', {
				projects: [deps.projectGid],
				notes: 'created by a write acceptance spec',
			})
			try {
				const task = await api.getTask(created.gid, { optFields: 'name,notes' })
				expect(task.name).toBe('cyber-asana write probe: create')
				expect(task.notes).toBe('created by a write acceptance spec')
			} finally {
				await api.deleteTask(created.gid)
			}
		})

		it('updates the fields it is given', async () => {
			const api = deps.getApi()
			const created = await api.createTask(deps.workspaceGid, 'cyber-asana write probe: update', {
				projects: [deps.projectGid],
			})
			try {
				await api.updateTask(created.gid, { name: 'cyber-asana write probe: updated', completed: true })
				const task = await api.getTask(created.gid, { optFields: 'name,completed' })
				expect(task.name).toBe('cyber-asana write probe: updated')
				expect(task.completed).toBe(true)
			} finally {
				await api.deleteTask(created.gid)
			}
		})

		it('deletes a task so it can no longer be read', async () => {
			const api = deps.getApi()
			const created = await api.createTask(deps.workspaceGid, 'cyber-asana write probe: delete', {
				projects: [deps.projectGid],
			})
			await api.deleteTask(created.gid)
			await expect(api.getTask(created.gid)).rejects.toBeDefined()
		})
	}
}

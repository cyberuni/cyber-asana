import { expect, it } from 'vitest'
import type { ListResult } from '../platform/pagination.js'
import type { TaskApi } from './api.js'

export type SubtaskPositionAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'createTask' | 'updateTask' | 'reorderSubtask' | 'listSubtasks' | 'deleteTask'>
	workspaceGid: string
}

function gids(result: ListResult<{ gid: string }>) {
	return (Array.isArray(result) ? result : result.data).map((task) => task.gid)
}

export function defineSubtaskPositionAcceptanceSpecs(deps: SubtaskPositionAcceptanceDeps) {
	return () => {
		it('places a task under a parent at the given position and moves it within that parent', async () => {
			const api = deps.getApi()
			const created: string[] = []
			const create = async (name: string) => {
				const task = await api.createTask(deps.workspaceGid, `cyber-asana subtask-position probe ${name}`)
				created.push(task.gid)
				return task.gid
			}
			try {
				const parent = await create('parent')
				const a = await create('A')
				const b = await create('B')
				const c = await create('C')

				await api.updateTask(a, { parent })
				await api.updateTask(b, { parent, insert_after: a })
				await api.updateTask(c, { parent, insert_after: a })
				expect(gids(await api.listSubtasks(parent))).toEqual([a, c, b])

				await api.reorderSubtask(b, { insertBefore: a })
				expect(gids(await api.listSubtasks(parent))).toEqual([b, a, c])

				await api.reorderSubtask(b, { insertAfter: c })
				expect(gids(await api.listSubtasks(parent))).toEqual([a, c, b])
			} finally {
				for (const gid of created.reverse()) await api.deleteTask(gid)
			}
		})
	}
}

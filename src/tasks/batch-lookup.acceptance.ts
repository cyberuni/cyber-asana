import { expect, it } from 'vitest'
import type { TaskApi } from './api.js'

export type BatchLookupAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'getTask' | 'getTasksByGid'>
	primaryTaskGid: string
	secondaryTaskGid?: string
	invalidTaskGid?: string
}

const richOptFields = 'gid,name,completed,due_on,assignee,permalink_url,resource_subtype'

function pickTaskFields(task: Record<string, unknown>) {
	return {
		gid: task.gid,
		name: task.name,
		completed: task.completed,
		due_on: task.due_on,
		assignee: task.assignee,
		permalink_url: task.permalink_url,
		resource_subtype: task.resource_subtype,
	}
}

export function defineBatchLookupAcceptanceSpecs(deps: BatchLookupAcceptanceDeps) {
	return () => {
		it('returns the same task fields for single and batched lookup', async () => {
			const api = deps.getApi()
			const singleTask = await api.getTask(deps.primaryTaskGid)
			const batchResult = await api.getTasksByGid([deps.primaryTaskGid], { optFields: richOptFields })

			expect(batchResult).toHaveLength(1)
			expect(batchResult[0]).toMatchObject({ gid: deps.primaryTaskGid, ok: true })
			if (!batchResult[0].ok) throw new Error('expected successful batched task lookup')

			expect(pickTaskFields(batchResult[0].task)).toEqual(pickTaskFields(singleTask as Record<string, unknown>))
		})

		it('preserves input order across multiple task GIDs', async () => {
			if (!deps.secondaryTaskGid) return

			const api = deps.getApi()
			const batchResult = await api.getTasksByGid([deps.secondaryTaskGid, deps.primaryTaskGid], {
				optFields: 'gid,name',
			})

			expect(batchResult.map((item) => item.gid)).toEqual([deps.secondaryTaskGid, deps.primaryTaskGid])
			expect(batchResult.every((item) => item.ok)).toBe(true)
		})

		it('returns a per-gid failure for an invalid task lookup', async () => {
			const invalidGid = deps.invalidTaskGid ?? '0'
			const api = deps.getApi()
			const batchResult = await api.getTasksByGid([deps.primaryTaskGid, invalidGid], { optFields: 'gid,name' })

			expect(batchResult[0]).toMatchObject({ gid: deps.primaryTaskGid, ok: true })
			expect(batchResult[1]).toMatchObject({ gid: invalidGid, ok: false })
			if (batchResult[1].ok) throw new Error('expected invalid task lookup to fail')
			expect(batchResult[1].status).toBeGreaterThanOrEqual(400)
		})
	}
}

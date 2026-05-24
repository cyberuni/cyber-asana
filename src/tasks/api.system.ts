import { describe, expect, it } from 'vitest'
import { getTask, getTasksByGid } from './api.js'

const systemEnabled = Boolean(process.env.ASANA_SYSTEM_TEST && process.env.ASANA_TOKEN)
const primaryTaskGid = process.env.ASANA_SYSTEM_TEST_TASK_GID
const secondaryTaskGid = process.env.ASANA_SYSTEM_TEST_SECOND_TASK_GID
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

describe.skipIf(!systemEnabled || !primaryTaskGid)('tasks/api system', () => {
	it('returns the same task fields for single and batched lookup', async () => {
		const singleTask = await getTask(primaryTaskGid!)
		const batchResult = await getTasksByGid([primaryTaskGid!], { optFields: richOptFields })

		expect(batchResult).toHaveLength(1)
		expect(batchResult[0]).toMatchObject({ gid: primaryTaskGid, ok: true })
		if (!batchResult[0].ok) throw new Error('expected successful batched task lookup')

		expect(pickTaskFields(batchResult[0].task)).toEqual(pickTaskFields(singleTask as Record<string, unknown>))
	})

	it.skipIf(!secondaryTaskGid)('preserves input order across multiple task GIDs', async () => {
		const batchResult = await getTasksByGid([secondaryTaskGid!, primaryTaskGid!], { optFields: 'gid,name' })

		expect(batchResult.map((item) => item.gid)).toEqual([secondaryTaskGid, primaryTaskGid])
		expect(batchResult.every((item) => item.ok)).toBe(true)
	})

	it('returns a per-gid failure for an invalid task lookup', async () => {
		const batchResult = await getTasksByGid([primaryTaskGid!, '0'], { optFields: 'gid,name' })

		expect(batchResult[0]).toMatchObject({ gid: primaryTaskGid, ok: true })
		expect(batchResult[1]).toMatchObject({ gid: '0', ok: false })
		if (batchResult[1].ok) throw new Error('expected invalid task lookup to fail')
		expect(batchResult[1].status).toBeGreaterThanOrEqual(400)
	})
})

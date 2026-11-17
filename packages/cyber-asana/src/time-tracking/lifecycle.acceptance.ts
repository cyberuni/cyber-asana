import { expect, it } from 'vitest'
import { listItems } from '../platform/pagination.js'
import type { TimeTrackingEntryApi } from './api.js'

export type TimeTrackingLifecycleDeps = {
	getApi: () => Pick<
		TimeTrackingEntryApi,
		| 'createTimeTrackingEntry'
		| 'getTimeTrackingEntry'
		| 'updateTimeTrackingEntry'
		| 'deleteTimeTrackingEntry'
		| 'listTimeTrackingEntriesForTask'
	>
	taskGid: string
}

/**
 * The create, list, read, update, delete round trip of one time tracking entry: the request bodies
 * behind `time-entry create | for-task | get | update | delete`. It deletes the entry it makes, and the
 * second delete checks that a repeat does not fail the caller.
 */
export function defineTimeTrackingLifecycleAcceptanceSpecs(deps: TimeTrackingLifecycleDeps) {
	return () => {
		it('logs, lists, reads, corrects and deletes an entry', async () => {
			const api = deps.getApi()
			const created = await api.createTimeTrackingEntry(deps.taskGid, { durationMinutes: 15, enteredOn: '2026-01-02' })
			let deleted = false
			try {
				expect(created.gid).toBeTruthy()
				expect(created.duration_minutes).toBe(15)

				const listed = listItems(
					(await api.listTimeTrackingEntriesForTask(deps.taskGid, { fetchAll: true, optFields: 'gid' })) as never,
				) as Array<{ gid: string }>
				expect(listed.some((e) => e.gid === created.gid)).toBe(true)

				const read = await api.getTimeTrackingEntry(created.gid, { optFields: 'gid,duration_minutes,entered_on' })
				expect(read.entered_on).toBe('2026-01-02')

				const updated = await api.updateTimeTrackingEntry(created.gid, { durationMinutes: 30 })
				expect(updated.duration_minutes).toBe(30)

				await api.deleteTimeTrackingEntry(created.gid)
				deleted = true
			} finally {
				if (!deleted) await api.deleteTimeTrackingEntry(created.gid)
			}
		})
	}
}

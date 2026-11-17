import { describe } from 'vitest'
import { createTimeTrackingEntryApi } from './api.js'
import type { TimeTrackingEntry, TimeTrackingEntryGateway } from './gateway.js'
import { defineTimeTrackingLifecycleAcceptanceSpecs } from './lifecycle.acceptance.js'

/** A gateway double that keeps entries in a map, so the lifecycle spec runs without the SDK. */
function createEntryGateway(): TimeTrackingEntryGateway {
	let next = 1
	const entries = new Map<string, TimeTrackingEntry & { taskGid: string }>()
	const find = (gid: string) => {
		const entry = entries.get(gid)
		if (!entry) throw Object.assign(new Error('Not Found'), { status: 404 })
		return entry
	}
	const body = (f: { durationMinutes?: number; enteredOn?: string }) => ({
		...(f.durationMinutes !== undefined && { duration_minutes: f.durationMinutes }),
		...(f.enteredOn !== undefined && { entered_on: f.enteredOn }),
	})
	return {
		createTimeTrackingEntry: async (task, fields) => {
			const entry = { gid: `e${next++}`, taskGid: task, ...body(fields) }
			entries.set(entry.gid, entry)
			return { ...entry }
		},
		getTimeTrackingEntry: async (gid) => ({ ...find(gid) }),
		updateTimeTrackingEntry: async (gid, fields) => ({ ...Object.assign(find(gid), body(fields)) }),
		deleteTimeTrackingEntry: async (gid) => {
			entries.delete(gid)
		},
		listTimeTrackingEntriesForTask: async (task) => [...entries.values()].filter((e) => e.taskGid === task),
		listTimeTrackingEntries: async () => [...entries.values()],
	}
}

describe(
	'time-tracking/lifecycle acceptance',
	defineTimeTrackingLifecycleAcceptanceSpecs({
		getApi: () => createTimeTrackingEntryApi(createEntryGateway()),
		taskGid: 't1',
	}),
)

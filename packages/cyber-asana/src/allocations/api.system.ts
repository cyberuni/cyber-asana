import { describe, expect, it } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineAllocationListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.allocations
}

/** A 402 means the workspace's plan has no resource management; the suites below cannot run there. */
async function planIncludesAllocations() {
	try {
		await getApi().listAllocations({ assignee: 'me', workspace: workspaceGid!, limit: 1 })
		return true
	} catch (error) {
		if ((error as { response?: { status?: number } }).response?.status === 402) return false
		throw error
	}
}

describe.skipIf(!systemEnabled)('allocations/api system', async () => {
	const available = await planIncludesAllocations()

	describe.skipIf(!available)(
		'list pagination',
		defineAllocationListPaginationAcceptanceSpecs({
			getApi,
			filters: { assignee: 'me', workspace: workspaceGid! },
			includeFetchAll: false,
		}),
	)

	// Confirms the (docs) body fields — assignee, parent, start_date, end_date, effort {type, value} —
	// by creating an allocation, reading the same fields back, and deleting it.
	describe.skipIf(!available || !projectGid)('body fields', () => {
		it('creates, reads back, updates, and deletes an allocation', async () => {
			const api = getApi()
			const created = (await api.createAllocation({
				assignee: 'me',
				parent: projectGid!,
				start_date: '2030-01-07',
				end_date: '2030-01-18',
				effort: { type: 'hours', value: 8 },
			})) as Record<string, any>
			try {
				const read = (await api.getAllocation(created.gid, {
					optFields: 'assignee.gid,parent.gid,start_date,end_date,effort.type,effort.value',
				})) as Record<string, any>
				expect(read.parent.gid).toBe(projectGid)
				expect(read.start_date).toBe('2030-01-07')
				expect(read.end_date).toBe('2030-01-18')
				expect(read.effort).toMatchObject({ type: 'hours', value: 8 })

				const updated = (await api.updateAllocation(created.gid, {
					effort: { type: 'percent', value: 25 },
				})) as Record<string, any>
				expect(updated.gid).toBe(created.gid)
			} finally {
				await api.deleteAllocation(created.gid)
			}
		})
	})
})

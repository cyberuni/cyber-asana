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

/** The allocations endpoints do not take the `me` alias (404 "Not a recognized ID: me"), so the token's own GID stands in. */
async function currentUserGid() {
	getApi()
	return (await (runtimeContext as RuntimeContext).users.getUser('me', { optFields: 'gid' })).gid as string
}

/** A 402 means the workspace's plan has no resource management; the suites below cannot run there. */
async function planIncludesAllocations(assignee: string) {
	try {
		await getApi().listAllocations({ assignee, workspace: workspaceGid!, limit: 1 })
		return true
	} catch (error) {
		if ((error as { response?: { status?: number } }).response?.status === 402) return false
		throw error
	}
}

describe.skipIf(!systemEnabled)('allocations/api system', async () => {
	const meGid = await currentUserGid()
	const available = await planIncludesAllocations(meGid)

	describe.skipIf(!available)(
		'list pagination',
		defineAllocationListPaginationAcceptanceSpecs({
			getApi,
			filters: { assignee: meGid, workspace: workspaceGid! },
			includeFetchAll: false,
		}),
	)

	// Confirms the (docs) body fields — assignee, parent, start_date, end_date, effort {type, value} —
	// by creating an allocation, reading the same fields back, and deleting it.
	describe.skipIf(!available || !projectGid)('body fields', () => {
		it('creates, reads back, updates, and deletes an allocation', async () => {
			const api = getApi()
			const created = (await api.createAllocation({
				assignee: meGid,
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

	// Asana's GET /allocations 404s on assignee=me; the api layer resolves it to the caller's GID (#351).
	describe.skipIf(!available)('assignee me', () => {
		it('lists the same allocations for me as for the caller GID', async () => {
			const api = getApi()
			const me = await runtimeContext!.users.getMe({ optFields: 'gid' })
			const byMe = await api.listAllocations({ assignee: 'me', workspace: workspaceGid!, limit: 5, optFields: 'gid' })
			const byGid = await api.listAllocations({
				assignee: me.gid,
				workspace: workspaceGid!,
				limit: 5,
				optFields: 'gid',
			})

			expect(byMe).toEqual(byGid)
		})
	})

	// #353. The API stores `effort.value` as given and returns it unchanged for any span: it reports no
	// weekly or total figure and applies no per-week cap. So the response cannot say whether hours mean
	// per allocation or per week; that meaning lives only in Asana's workload UI. See scrum-system.md 9.5.
	describe.skipIf(!available || !projectGid)('hours semantics', () => {
		it('stores hours verbatim whether the span is one day or two weeks', async () => {
			const api = getApi()
			const spans = [
				['2030-01-07', '2030-01-07'],
				['2030-01-07', '2030-01-20'],
			] as const
			for (const [start_date, end_date] of spans) {
				const created = (await api.createAllocation({
					assignee: meGid,
					parent: projectGid!,
					start_date,
					end_date,
					effort: { type: 'hours', value: 10 },
				})) as Record<string, any>
				try {
					const read = (await api.getAllocation(created.gid, {
						optFields: 'start_date,end_date,effort.type,effort.value',
					})) as Record<string, any>
					expect(read).toMatchObject({ start_date, end_date, effort: { type: 'hours', value: 10 } })
				} finally {
					await api.deleteAllocation(created.gid)
				}
			}
		})
	})

	describe.skipIf(!available || !projectGid)('create with assignee me', () => {
		it('creates for the caller and deletes it', async () => {
			const api = getApi()
			const created = (await api.createAllocation({
				assignee: 'me',
				parent: projectGid!,
				start_date: '2030-01-07',
				end_date: '2030-01-11',
				effort: { type: 'hours', value: 4 },
			})) as Record<string, any>
			try {
				const read = (await api.getAllocation(created.gid, { optFields: 'assignee.gid' })) as Record<string, any>
				expect(read.assignee.gid).toBe(meGid)
			} finally {
				await api.deleteAllocation(created.gid)
			}
		})
	})
})

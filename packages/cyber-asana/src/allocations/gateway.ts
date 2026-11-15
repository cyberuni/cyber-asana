import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** How much of a person's time an allocation takes: a percentage of their working time, or hours. */
export type AllocationEffort = { type: 'hours' | 'percent'; value: number }

/** An allocation as Asana returns it; the SDK ships no model type, so the documented fields are written out. */
export type Allocation = {
	gid: string
	resource_type?: string
	assignee?: { gid?: string; name?: string; resource_type?: string } | null
	parent?: { gid?: string; name?: string; resource_type?: string } | null
	start_date?: string | null
	end_date?: string | null
	effort?: { type?: 'hours' | 'percent'; value?: number } | null
}

/** What `getAllocations` filters on. Asana reads `parent` as a project GID. */
export type AllocationListFilters = {
	parent?: string
	assignee?: string
	workspace?: string
}

export type AllocationListOptions = PaginationOptions & AllocationListFilters

/** Body fields come from Asana's API documentation; the system test confirms them against the live API. */
export type AllocationCreateFields = {
	assignee: string
	parent: string
	start_date: string
	end_date: string
	effort?: AllocationEffort
}

export type AllocationUpdateFields = Partial<Omit<AllocationCreateFields, 'assignee' | 'parent'>>

export type AllocationGateway = {
	listAllocations(opts?: AllocationListOptions): Promise<ListResult<Allocation>>
	getAllocation(allocationGid: string, opts?: ReadOptions): Promise<Allocation>
	createAllocation(fields: AllocationCreateFields): Promise<Allocation>
	updateAllocation(allocationGid: string, fields: AllocationUpdateFields): Promise<Allocation>
	deleteAllocation(allocationGid: string): Promise<void>
}

/**
 * Asana answers "Not a recognized ID: me" for an allocation assignee, unlike most user fields, so `me`
 * (which the CLI and MCP tools document) is swapped for the caller's GID before the request.
 */
export async function resolveAssignee(
	assignee: string | undefined,
	getMe: () => Promise<string>,
): Promise<string | undefined> {
	return assignee === 'me' ? await getMe() : assignee
}

function toAsanaListOptions(opts: AllocationListOptions | undefined, assignee: string | undefined) {
	return {
		...toAsanaPaginationOptions(opts),
		...(opts?.parent !== undefined && { parent: opts.parent }),
		...(assignee !== undefined && { assignee }),
		...(opts?.workspace !== undefined && { workspace: opts.workspace }),
	}
}

export function createAsanaAllocationGateway(client: Asana.ApiClient): AllocationGateway {
	const allocationsApi = new Asana.AllocationsApi(client)
	const usersApi = new Asana.UsersApi(client)
	const getMe = async () => ((await usersApi.getUser('me', { opt_fields: 'gid' })).data as { gid: string }).gid

	return {
		async listAllocations(opts) {
			const res = await allocationsApi.getAllocations(
				toAsanaListOptions(opts, await resolveAssignee(opts?.assignee, getMe)),
			)
			return await collectListResponse(res, opts)
		},
		async getAllocation(allocationGid, opts) {
			const res = await allocationsApi.getAllocation(allocationGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createAllocation(fields) {
			const assignee = (await resolveAssignee(fields.assignee, getMe)) as string
			const res = await allocationsApi.createAllocation({ data: { ...fields, assignee } }, {})
			return res.data
		},
		async updateAllocation(allocationGid, fields) {
			const res = await allocationsApi.updateAllocation({ data: fields }, allocationGid, {})
			return res.data
		},
		async deleteAllocation(allocationGid) {
			await allocationsApi.deleteAllocation(allocationGid)
		},
	}
}

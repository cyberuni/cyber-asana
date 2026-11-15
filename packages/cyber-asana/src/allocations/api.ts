import type { ReadOptions } from '../platform/read-options.js'
import type { UserGateway } from '../users/gateway.js'
import type {
	AllocationCreateFields,
	AllocationGateway,
	AllocationListOptions,
	AllocationUpdateFields,
} from './gateway.js'

export type AllocationApi = ReturnType<typeof createAllocationApi>

export type AllocationApiDeps = { users: Pick<UserGateway, 'getMe'> }

export function createAllocationApi(gateway: AllocationGateway, deps: AllocationApiDeps) {
	/** Asana's allocations endpoints reject the `me` alias (404), so swap it for the caller's GID. */
	async function resolveAssignee(assignee: string | undefined) {
		if (assignee !== 'me') return assignee
		const { gid } = await deps.users.getMe({ optFields: 'gid' })
		return gid
	}

	return {
		async listAllocations(opts?: AllocationListOptions) {
			if (opts?.assignee !== 'me') return gateway.listAllocations(opts)
			return gateway.listAllocations({ ...opts, assignee: await resolveAssignee('me') })
		},
		getAllocation(allocationGid: string, opts?: ReadOptions) {
			return gateway.getAllocation(allocationGid, opts)
		},
		async createAllocation(fields: AllocationCreateFields) {
			return gateway.createAllocation({
				...fields,
				assignee: (await resolveAssignee(fields.assignee)) ?? fields.assignee,
			})
		},
		updateAllocation(allocationGid: string, fields: AllocationUpdateFields) {
			return gateway.updateAllocation(allocationGid, fields)
		},
		deleteAllocation(allocationGid: string) {
			return gateway.deleteAllocation(allocationGid)
		},
	}
}

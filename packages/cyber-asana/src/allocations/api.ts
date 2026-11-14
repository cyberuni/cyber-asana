import type { ReadOptions } from '../platform/read-options.js'
import type {
	AllocationCreateFields,
	AllocationGateway,
	AllocationListOptions,
	AllocationUpdateFields,
} from './gateway.js'

export type AllocationApi = ReturnType<typeof createAllocationApi>

export function createAllocationApi(gateway: AllocationGateway) {
	return {
		listAllocations(opts?: AllocationListOptions) {
			return gateway.listAllocations(opts)
		},
		getAllocation(allocationGid: string, opts?: ReadOptions) {
			return gateway.getAllocation(allocationGid, opts)
		},
		createAllocation(fields: AllocationCreateFields) {
			return gateway.createAllocation(fields)
		},
		updateAllocation(allocationGid: string, fields: AllocationUpdateFields) {
			return gateway.updateAllocation(allocationGid, fields)
		},
		deleteAllocation(allocationGid: string) {
			return gateway.deleteAllocation(allocationGid)
		},
	}
}

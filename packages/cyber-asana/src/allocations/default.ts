import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createAllocationApi } from './api.js'
import {
	type AllocationCreateFields,
	type AllocationListOptions,
	type AllocationUpdateFields,
	createAsanaAllocationGateway,
} from './gateway.js'

function defaultAllocationApi() {
	return createAllocationApi(createAsanaAllocationGateway(createClient()))
}

export async function listAllocations(opts?: AllocationListOptions) {
	return defaultAllocationApi().listAllocations(opts)
}

export async function getAllocation(allocationGid: string, opts?: ReadOptions) {
	return defaultAllocationApi().getAllocation(allocationGid, opts)
}

export async function createAllocation(fields: AllocationCreateFields) {
	return defaultAllocationApi().createAllocation(fields)
}

export async function updateAllocation(allocationGid: string, fields: AllocationUpdateFields) {
	return defaultAllocationApi().updateAllocation(allocationGid, fields)
}

export async function deleteAllocation(allocationGid: string) {
	return defaultAllocationApi().deleteAllocation(allocationGid)
}

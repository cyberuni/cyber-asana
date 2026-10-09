import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import {
	createAsanaMembershipGateway,
	type MembershipFields,
	type MembershipFilters,
	type MembershipGateway,
} from './gateway.js'

export type MembershipApi = ReturnType<typeof createMembershipApi>

export function createMembershipApi(gateway: MembershipGateway) {
	return {
		listMemberships(filters: MembershipFilters, opts?: PaginationOptions) {
			return gateway.listMemberships(filters, opts)
		},
		getMembership(membershipGid: string) {
			return gateway.getMembership(membershipGid)
		},
		createMembership(parentGid: string, memberGid: string, fields?: MembershipFields) {
			return gateway.createMembership(parentGid, memberGid, fields)
		},
		updateMembership(membershipGid: string, fields: MembershipFields) {
			return gateway.updateMembership(membershipGid, fields)
		},
		deleteMembership(membershipGid: string) {
			return gateway.deleteMembership(membershipGid)
		},
	}
}

function defaultMembershipApi() {
	return createMembershipApi(createAsanaMembershipGateway(createClient()))
}

export async function listMemberships(filters: MembershipFilters, opts?: PaginationOptions) {
	return defaultMembershipApi().listMemberships(filters, opts)
}

export async function getMembership(membershipGid: string) {
	return defaultMembershipApi().getMembership(membershipGid)
}

export async function createMembership(parentGid: string, memberGid: string, fields?: MembershipFields) {
	return defaultMembershipApi().createMembership(parentGid, memberGid, fields)
}

export async function updateMembership(membershipGid: string, fields: MembershipFields) {
	return defaultMembershipApi().updateMembership(membershipGid, fields)
}

export async function deleteMembership(membershipGid: string) {
	return defaultMembershipApi().deleteMembership(membershipGid)
}

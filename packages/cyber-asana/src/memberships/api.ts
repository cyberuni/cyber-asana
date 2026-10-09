import type { PaginationOptions } from '../platform/pagination.js'
import type { MembershipFields, MembershipFilters, MembershipGateway } from './gateway.js'

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

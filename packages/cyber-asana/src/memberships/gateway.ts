import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'

/**
 * Filters for the unified memberships endpoint. `parent` is a goal, project,
 * portfolio, custom type, or custom field GID; `member` is a user or team GID.
 * Asana requires `resource_subtype` when `parent` is absent.
 */
export type MembershipFilters = {
	parent?: string
	member?: string
	resource_subtype?: string
}

export type MembershipFields = {
	access_level?: string
}

export type MembershipGateway = {
	listMemberships(filters: MembershipFilters, opts?: PaginationOptions): Promise<ListResult<any>>
	getMembership(membershipGid: string): Promise<any>
	createMembership(parentGid: string, memberGid: string, fields?: MembershipFields): Promise<any>
	updateMembership(membershipGid: string, fields: MembershipFields): Promise<any>
	deleteMembership(membershipGid: string): Promise<void>
}

export function createAsanaMembershipGateway(client: Asana.ApiClient): MembershipGateway {
	const membershipsApi = new Asana.MembershipsApi(client)

	return {
		async listMemberships(filters, opts) {
			const res = await membershipsApi.getMemberships({
				parent: filters.parent,
				member: filters.member,
				resource_subtype: filters.resource_subtype,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getMembership(membershipGid) {
			const res = await membershipsApi.getMembership(membershipGid)
			return res.data
		},
		async createMembership(parentGid, memberGid, fields) {
			const res = await membershipsApi.createMembership({
				body: { data: { parent: parentGid, member: memberGid, ...fields } },
			})
			return res.data
		},
		async updateMembership(membershipGid, fields) {
			const res = await membershipsApi.updateMembership({ data: fields }, membershipGid)
			return res.data
		},
		async deleteMembership(membershipGid) {
			await membershipsApi.deleteMembership(membershipGid)
		},
	}
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import type { MembershipApi } from './api.js'
import { createMembership, deleteMembership, getMembership, listMemberships, updateMembership } from './api.js'
import type { MembershipFilters } from './gateway.js'

function resolveMembershipApi(api?: MembershipApi | (() => MembershipApi)): MembershipApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listMemberships,
			getMembership,
			createMembership,
			updateMembership,
			deleteMembership,
		}
	)
}

function filters(params: { parent_gid?: string; member_gid?: string; resource_subtype?: string }): MembershipFilters {
	return {
		...(params.parent_gid ? { parent: params.parent_gid } : {}),
		...(params.member_gid ? { member: params.member_gid } : {}),
		...(params.resource_subtype ? { resource_subtype: params.resource_subtype } : {}),
	}
}

export function registerMembershipTools(server: McpServer, api?: MembershipApi | (() => MembershipApi)) {
	server.tool(
		'asana_membership_list',
		'List Asana memberships for a parent (project, portfolio, goal, custom type, or custom field) and/or a member (user or team). Pass resource_subtype when parent_gid is omitted.',
		{
			parent_gid: z.string().optional().describe('Parent GID — project, portfolio, goal, custom type, or custom field'),
			member_gid: z.string().optional().describe('Member GID — user or team'),
			resource_subtype: z
				.string()
				.optional()
				.describe('Membership type to return, e.g. project_membership; required when parent_gid is omitted'),
			...paginationParams,
		},
		async ({ parent_gid, member_gid, resource_subtype, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveMembershipApi(api).listMemberships(
							filters({ parent_gid, member_gid, resource_subtype }),
							paginationOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_membership_get',
		'Get an Asana membership by GID',
		{ membership_gid: z.string().describe('Membership GID') },
		async ({ membership_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveMembershipApi(api).getMembership(membership_gid)) }],
		}),
	)

	server.tool(
		'asana_membership_create',
		'Add a member (user or team) to an Asana project, portfolio, or goal',
		{
			parent_gid: z.string().describe('Parent GID — project, portfolio, goal, custom type, or custom field'),
			member_gid: z.string().describe('Member GID — user or team'),
			access_level: z
				.string()
				.optional()
				.describe('Access level for the new member, e.g. admin, editor, commenter, viewer'),
		},
		async ({ parent_gid, member_gid, access_level }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveMembershipApi(api).createMembership(
							parent_gid,
							member_gid,
							access_level ? { access_level } : undefined,
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_membership_update',
		"Change an Asana membership's access level",
		{
			membership_gid: z.string().describe('Membership GID'),
			access_level: z.string().describe('New access level, e.g. admin, editor, commenter, viewer'),
		},
		async ({ membership_gid, access_level }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveMembershipApi(api).updateMembership(membership_gid, { access_level })),
				},
			],
		}),
	)

	server.tool(
		'asana_membership_delete',
		'Remove an Asana membership',
		{ membership_gid: z.string().describe('Membership GID') },
		async ({ membership_gid }) => {
			const result = await deleteIdempotently('membership', membership_gid, () =>
				resolveMembershipApi(api).deleteMembership(membership_gid),
			)
			return { content: [{ type: 'text', text: JSON.stringify(result) }] }
		},
	)
}

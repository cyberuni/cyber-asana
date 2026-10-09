import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { MembershipApi } from './api.js'
import { createMembership, deleteMembership, getMembership, listMemberships, updateMembership } from './api.js'
import type { MembershipFilters } from './gateway.js'

type Membership = {
	gid: string
	resource_subtype?: string
	access_level?: string
	member?: { gid?: string; name?: string }
	parent?: { gid?: string; name?: string }
}

function memberLabel(m: Membership) {
	return m.member?.name ?? m.member?.gid ?? '—'
}

function fmtMembership(m: Membership) {
	printFields({
		Member: memberLabel(m),
		Parent: m.parent?.name ?? m.parent?.gid ?? null,
		Access: m.access_level ?? null,
		Type: m.resource_subtype ?? null,
		ID: m.gid,
	})
}

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

// Minimal default schema for membership lists — principle 2.
const MEMBERSHIP_LIST_FIELDS = 'gid,member.name,access_level'

const MEMBERSHIP_LIST_NEXT_STEPS = [
	'cyber-asana membership get <gid> — view one membership',
	"cyber-asana membership update <gid> --access-level editor — change a member's access",
	'cyber-asana membership create --parent-gid <gid> --member-gid <gid> — add a member',
]

/**
 * Asana takes either a parent, or a member paired with a resource subtype. Anything
 * else is a 400 from the API, so it is rejected here as a usage error instead.
 */
function membershipFilters(opts: Record<string, unknown>): MembershipFilters {
	const parent = normalizedGid(opts, 'parent')
	const member = normalizedGid(opts, 'member')
	const resourceSubtype = typeof opts.resourceSubtype === 'string' ? opts.resourceSubtype : undefined

	if (!parent && !(member && resourceSubtype)) {
		throw new InvalidArgumentError('--parent-gid is required, or pass --member-gid together with --resource-subtype')
	}

	return {
		...(parent ? { parent } : {}),
		...(member ? { member } : {}),
		...(resourceSubtype ? { resource_subtype: resourceSubtype } : {}),
	}
}

export function membershipCommand(api?: MembershipApi | (() => MembershipApi)) {
	const cmd = new Command('membership').description('Manage Asana memberships (who has access to what)')

	cmd.addHelpText(
		'after',
		[
			'',
			'A membership links a member (user or team) to a parent (project, portfolio, goal,',
			'custom type, or custom field) at an access level.',
			'',
			'Examples:',
			'  cyber-asana membership list --parent-gid <project-gid>',
			'  cyber-asana membership list --parent-gid <project-gid> --member-gid <user-gid>',
			'  cyber-asana membership list --member-gid <team-gid> --resource-subtype project_membership',
			'  cyber-asana membership get <gid>',
			'  cyber-asana membership create --parent-gid <project-gid> --member-gid <user-gid> --access-level editor',
			'  cyber-asana membership update <gid> --access-level viewer',
			'  cyber-asana membership delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	const listCmd = addGidOption(
		addGidOption(
			cmd.command('list').description('List memberships for a parent and/or a member'),
			'parent',
			'Parent GID (project, portfolio, goal, custom type, or custom field)',
		),
		'member',
		'Member GID (user or team)',
	).option(
		'--resource-subtype <subtype>',
		'Membership type to return, e.g. project_membership (required when --parent-gid is omitted)',
	)
	addPaginationOptions(listCmd).action(
		async (opts: {
			parent?: string
			parentGid?: string
			member?: string
			memberGid?: string
			resourceSubtype?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const filters = membershipFilters(opts)
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= MEMBERSHIP_LIST_FIELDS
			const data = await resolveMembershipApi(api).listMemberships(filters, pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Member', get: memberLabel },
						{ label: 'Access', get: (m: Membership) => m.access_level ?? '—' },
						{ label: 'ID', get: (m: Membership) => m.gid },
					],
					{ entity: 'memberships' },
				)
				printCountSummary(items.length, 'membership(s)')
				printNextPageHint(data)
				printNextSteps(MEMBERSHIP_LIST_NEXT_STEPS)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a membership by GID')
		.action(async (gid: string) => {
			const data = await resolveMembershipApi(api).getMembership(gid)
			output(data, () => fmtMembership(data))
		})

	const createCmd = addGidOption(
		addGidOption(
			cmd.command('create').description('Add a member to a project, portfolio, or goal'),
			'parent',
			'Parent GID (project, portfolio, goal, custom type, or custom field)',
		),
		'member',
		'Member GID (user or team)',
	).option('--access-level <level>', 'Access level for the new member, e.g. admin, editor, commenter, viewer')
	createCmd.action(
		async (opts: {
			parent?: string
			parentGid?: string
			member?: string
			memberGid?: string
			accessLevel?: string
		}) => {
			const data = await resolveMembershipApi(api).createMembership(
				requiredGid(opts, 'parent', 'Parent GID'),
				requiredGid(opts, 'member', 'Member GID'),
				opts.accessLevel ? { access_level: opts.accessLevel } : undefined,
			)
			output(data, () => fmtMembership(data))
		},
	)

	cmd
		.command('update <gid>')
		.description("Change a membership's access level")
		.option('--access-level <level>', 'New access level, e.g. admin, editor, commenter, viewer')
		.action(async (gid: string, opts: { accessLevel?: string }) => {
			if (!opts.accessLevel) throw new InvalidArgumentError('--access-level is required')
			const data = await resolveMembershipApi(api).updateMembership(gid, { access_level: opts.accessLevel })
			output(data, () => fmtMembership(data))
		})

	cmd
		.command('delete <gid>')
		.description('Remove a membership')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('membership', gid, () => resolveMembershipApi(api).deleteMembership(gid))
			output(result, () => console.log(deleteMessage(result, 'Membership')))
		})

	return cmd
}

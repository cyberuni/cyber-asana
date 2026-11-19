import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	type PaginationCliOptions,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import type { UserApi } from './api.js'
import { getMe, getUser, listUsers } from './default.js'
import type { UserListOptions, UserReadOptions } from './gateway.js'

type User = { gid: string; name?: string; email?: string }

function fmtUser(u: User) {
	printFields({ Name: u.name ?? null, ID: u.gid, Email: u.email ?? null })
}

function fmtUserList(users: User[]) {
	printTable(
		users,
		[
			{ label: 'Name', get: (u) => u.name ?? '' },
			{ label: 'ID', get: (u) => u.gid },
			{ label: 'Email', get: (u) => u.email ?? '' },
		],
		{ entity: 'users' },
	)
}

type UserReadCliOptions = { optFields?: string; workspace?: string; workspaceGid?: string }

/**
 * `--workspace-gid` here is an explicit option only: unlike the list commands it does not fall back to
 * ASANA_WORKSPACE_GID, so a plain `user get` keeps sending no workspace.
 */
function addUserWorkspaceOption<T extends Command>(cmd: T) {
	return addGidOption(cmd, 'workspace', 'Workspace GID to read workspace-specific user fields for').addHelpText(
		'after',
		'\nThe workspace is sent only when given; ASANA_WORKSPACE_GID is not used here.',
	)
}

function userReadOptionsFromCli(opts: UserReadCliOptions): UserReadOptions | undefined {
	const workspaceGid = opts.workspaceGid ?? opts.workspace
	if (workspaceGid === undefined) return readOptionsFromCli(opts)
	return { ...readOptionsFromCli(opts), workspaceGid }
}

function resolveUserApi(api?: UserApi | (() => UserApi)): UserApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listUsers,
			getUser,
			getMe,
		}
	)
}

// Minimal default schema for user lists — principle 2.
const USER_LIST_FIELDS = 'gid,name,email'

export function userCommand(api?: UserApi | (() => UserApi)) {
	const cmd = new Command('user').description('Manage Asana users')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana user list --workspace-gid <gid>',
			'  cyber-asana user get <gid> --toon',
			'  cyber-asana user me',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(
			cmd.command('list').description('List users in a workspace, optionally only the members of a team'),
			'workspace',
			'Workspace GID',
		),
	)
		.option('--team <gid>', 'Only the members of this team GID')
		.action(async (opts: { workspace?: string; workspaceGid?: string; team?: string } & PaginationCliOptions) => {
			const pagination: UserListOptions = paginationOptionsFromCli(opts)
			if (opts.team !== undefined) pagination.team = opts.team
			pagination.optFields ??= USER_LIST_FIELDS
			const data = await resolveUserApi(api).listUsers(requiredGid(opts, 'workspace', 'Workspace GID'), pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				fmtUserList(items)
				printCountSummary(items.length, 'user(s)')
				printNextPageHint(data)
				printNextSteps([
					'cyber-asana user get <gid> — view a user',
					'cyber-asana ooo list --user-gid <gid> — check whether someone is out of office',
				])
			})
		})

	addUserWorkspaceOption(addReadOptions(cmd.command('get <gid>').description('Get a user by GID'))).action(
		async (gid: string, opts: UserReadCliOptions) => {
			const data = await resolveUserApi(api).getUser(gid, userReadOptionsFromCli(opts))
			output(data, () => {
				fmtUser(data)
				printNextSteps([`cyber-asana ooo list --user-gid ${gid} — check whether this user is out of office`])
			})
		},
	)

	addUserWorkspaceOption(addReadOptions(cmd.command('me').description('Get the authenticated user'))).action(
		async (opts: UserReadCliOptions) => {
			const data = await resolveUserApi(api).getMe(userReadOptionsFromCli(opts))
			output(data, () => {
				fmtUser(data)
				printNextSteps(['cyber-asana ooo list — your out-of-office entries'])
			})
		},
	)

	return cmd
}

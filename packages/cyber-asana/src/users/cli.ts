import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import type { UserApi } from './api.js'
import { getMe, getUser, listUsers } from './api.js'

type User = { gid: string; name: string; email?: string }

function fmtUser(u: User) {
	printFields({ Name: u.name, ID: u.gid, Email: u.email ?? null })
}

function fmtUserList(users: User[]) {
	printTable(
		users,
		[
			{ label: 'Name', get: (u) => u.name },
			{ label: 'ID', get: (u) => u.gid },
			{ label: 'Email', get: (u) => u.email ?? '' },
		],
		{ entity: 'users' },
	)
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
		addGidOption(cmd.command('list').description('List users in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
		{
			limit: false,
		},
	).action(async (opts: { workspace?: string; workspaceGid?: string; offset?: string; optFields?: string }) => {
		const pagination = paginationOptionsFromCli(opts)
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

	addReadOptions(cmd.command('get <gid>').description('Get a user by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveUserApi(api).getUser(gid, readOptionsFromCli(opts))
			output(data, () => {
				fmtUser(data)
				printNextSteps([`cyber-asana ooo list --user-gid ${gid} — check whether this user is out of office`])
			})
		},
	)

	addReadOptions(cmd.command('me').description('Get the authenticated user')).action(
		async (opts: { optFields?: string }) => {
			const data = await resolveUserApi(api).getMe(readOptionsFromCli(opts))
			output(data, () => {
				fmtUser(data)
				printNextSteps(['cyber-asana ooo list — your out-of-office entries'])
			})
		},
	)

	return cmd
}

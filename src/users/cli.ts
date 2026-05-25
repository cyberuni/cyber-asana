import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import type { UserApi } from './api.js'
import { getMe, getUser, listUsers } from './api.js'

type User = { gid: string; name: string; email?: string }

function fmtUser(u: User) {
	printFields({ Name: u.name, ID: u.gid, Email: u.email ?? null })
}

function fmtUserList(users: User[]) {
	printTable(users, [
		{ label: 'Name', get: (u) => u.name },
		{ label: 'ID', get: (u) => u.gid },
		{ label: 'Email', get: (u) => u.email ?? '' },
	])
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

export function userCommand(api?: UserApi | (() => UserApi)) {
	const cmd = new Command('user').description('Manage Asana users')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List users in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
		{
			limit: false,
		},
	).action(async (opts: { workspace?: string; workspaceGid?: string; offset?: string; optFields?: string }) => {
		const data = await resolveUserApi(api).listUsers(
			requiredGid(opts, 'workspace', 'Workspace GID'),
			paginationOptionsFromCli(opts),
		)
		output(data, () => {
			fmtUserList(itemsForOutput(data))
			printNextPageHint(data)
		})
	})

	cmd
		.command('get <gid>')
		.description('Get a user by GID')
		.action(async (gid: string) => {
			const data = await resolveUserApi(api).getUser(gid)
			output(data, () => fmtUser(data))
		})

	cmd
		.command('me')
		.description('Get the authenticated user')
		.action(async () => {
			const data = await resolveUserApi(api).getMe()
			output(data, () => fmtUser(data))
		})

	return cmd
}

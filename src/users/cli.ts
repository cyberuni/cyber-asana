import { Command, Option } from 'commander'
import { addPaginationOptions, itemsForOutput, paginationOptionsFromCli, printNextPageHint } from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { getMe, getUser, listUsers } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

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

export function userCommand() {
	const cmd = new Command('user').description('Manage Asana users')

	addPaginationOptions(cmd.command('list').description('List users in a workspace').addOption(workspaceOpt()), {
		limit: false,
	}).action(async (opts: { workspace: string; offset?: string; optFields?: string }) => {
		const data = await listUsers(opts.workspace, paginationOptionsFromCli(opts))
		output(data, () => {
			fmtUserList(itemsForOutput(data))
			printNextPageHint(data)
		})
	})

	cmd
		.command('get <gid>')
		.description('Get a user by GID')
		.action(async (gid: string) => {
			const data = await getUser(gid)
			output(data, () => fmtUser(data))
		})

	cmd
		.command('me')
		.description('Get the authenticated user')
		.action(async () => {
			const data = await getMe()
			output(data, () => fmtUser(data))
		})

	return cmd
}

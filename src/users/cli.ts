import { Command, Option } from 'commander'
import { getMe, getUser, listUsers } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

export function userCommand() {
	const cmd = new Command('user').description('Manage Asana users')

	cmd
		.command('list')
		.description('List users in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listUsers(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a user by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getUser(gid), null, 2))
		})

	cmd
		.command('me')
		.description('Get the authenticated user')
		.action(async () => {
			console.log(JSON.stringify(await getMe(), null, 2))
		})

	return cmd
}

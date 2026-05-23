import { Command } from 'commander'
import { getTeam, listTeams } from './api.js'

export function teamCommand() {
	const cmd = new Command('team').description('Manage Asana teams')

	cmd
		.command('list')
		.description('List teams in a workspace')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listTeams(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a team by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getTeam(gid), null, 2))
		})

	return cmd
}

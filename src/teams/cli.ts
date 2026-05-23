import { Command, Option } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { getTeam, listTeams } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Team = { gid: string; name: string }

export function teamCommand() {
	const cmd = new Command('team').description('Manage Asana teams')

	cmd
		.command('list')
		.description('List teams in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			const data = await listTeams(opts.workspace)
			output(data, () =>
				printTable(data, [
					{ label: 'Name', get: (t: Team) => t.name },
					{ label: 'ID', get: (t: Team) => t.gid },
				]),
			)
		})

	cmd
		.command('get <gid>')
		.description('Get a team by GID')
		.action(async (gid: string) => {
			const data = await getTeam(gid)
			output(data, () => printFields({ Name: (data as Team).name, ID: (data as Team).gid }))
		})

	return cmd
}

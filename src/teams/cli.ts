import { Command, Option } from 'commander'
import { addPaginationOptions, itemsForOutput, paginationOptionsFromCli, printNextPageHint } from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { getTeam, listTeams } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Team = { gid: string; name: string }

export function teamCommand() {
	const cmd = new Command('team').description('Manage Asana teams')

	addPaginationOptions(cmd.command('list').description('List teams in a workspace').addOption(workspaceOpt())).action(
		async (opts: { workspace: string; limit?: number; offset?: string; optFields?: string }) => {
			const data = await listTeams(opts.workspace, paginationOptionsFromCli(opts))
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (t: Team) => t.name },
					{ label: 'ID', get: (t: Team) => t.gid },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a team by GID')
		.action(async (gid: string) => {
			const data = await getTeam(gid)
			output(data, () => printFields({ Name: (data as Team).name, ID: (data as Team).gid }))
		})

	return cmd
}

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
import { getTeam, listTeams } from './api.js'

type Team = { gid: string; name: string }

export function teamCommand() {
	const cmd = new Command('team').description('Manage Asana teams')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List teams in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const data = await listTeams(requiredGid(opts, 'workspace', 'Workspace GID'), paginationOptionsFromCli(opts))
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

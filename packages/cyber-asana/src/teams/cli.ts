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
import type { TeamApi } from './api.js'
import { getTeam, listTeams } from './api.js'

type Team = { gid: string; name: string }

function resolveTeamApi(api?: TeamApi | (() => TeamApi)): TeamApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTeams,
			getTeam,
		}
	)
}

// Minimal default schema for team lists — principle 2.
const TEAM_LIST_FIELDS = 'gid,name'

export function teamCommand(api?: TeamApi | (() => TeamApi)) {
	const cmd = new Command('team').description('Manage Asana teams')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana team list --workspace-gid <gid>',
			'  cyber-asana team get <gid> --toon',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

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
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TEAM_LIST_FIELDS
			const data = await resolveTeamApi(api).listTeams(requiredGid(opts, 'workspace', 'Workspace GID'), pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: Team) => t.name },
						{ label: 'ID', get: (t: Team) => t.gid },
					],
					{ entity: 'teams' },
				)
				printCountSummary(items.length, 'team(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana team get <gid> — view a team'])
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a team by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveTeamApi(api).getTeam(gid, readOptionsFromCli(opts))
			output(data, () => printFields({ Name: (data as Team).name, ID: (data as Team).gid }))
		},
	)

	return cmd
}

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
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import type { TeamApi } from './api.js'
import { getTeam, listTeamMembers, listTeamProjects, listTeams } from './default.js'

type Team = { gid: string; name?: string }
type Member = { gid: string; user?: { gid?: string; name?: string } }
type Project = { gid: string; name?: string }

function resolveTeamApi(api?: TeamApi | (() => TeamApi)): TeamApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTeams,
			getTeam,
			listTeamMembers,
			listTeamProjects,
		}
	)
}

// Minimal default schema for team lists — principle 2.
const TEAM_LIST_FIELDS = 'gid,name'
const TEAM_MEMBER_FIELDS = 'user.gid,user.name'
const TEAM_PROJECT_FIELDS = 'gid,name'

export function teamCommand(api?: TeamApi | (() => TeamApi)) {
	const cmd = new Command('team').description('Manage Asana teams')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana team list --workspace-gid <gid>',
			'  cyber-asana team get <gid> --toon',
			'  cyber-asana team members <gid> --all',
			'  cyber-asana team projects <gid> --all',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List teams in a workspace'), 'workspace', 'Workspace GID'),
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
						{ label: 'Name', get: (t: Team) => t.name ?? '' },
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

	addPaginationOptions(cmd.command('members <gid>').description("List a team's members (with the user GID)")).action(
		async (gid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TEAM_MEMBER_FIELDS
			const data = await resolveTeamApi(api).listTeamMembers(gid, pagination)
			output(data, () => {
				const items = itemsForOutput(data) as Member[]
				printTable(
					items,
					[
						{ label: 'Name', get: (m: Member) => m.user?.name ?? '' },
						{ label: 'User ID', get: (m: Member) => m.user?.gid ?? '' },
					],
					{ entity: 'team members' },
				)
				printCountSummary(items.length, 'member(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana team projects <gid> — the projects of the team'])
			})
		},
	)

	addPaginationOptions(cmd.command('projects <gid>').description("List a team's projects"))
		.option('--archived', 'Only archived projects (default: both)')
		.action(async (gid: string, opts: { limit?: number; offset?: string; optFields?: string; archived?: boolean }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TEAM_PROJECT_FIELDS
			const data = await resolveTeamApi(api).listTeamProjects(gid, {
				...pagination,
				...(opts.archived && { archived: true }),
			})
			output(data, () => {
				const items = itemsForOutput(data) as Project[]
				printTable(
					items,
					[
						{ label: 'Name', get: (p: Project) => p.name ?? '' },
						{ label: 'ID', get: (p: Project) => p.gid },
					],
					{ entity: 'projects' },
				)
				printCountSummary(items.length, 'project(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana project get <gid> — view a project'])
			})
		})

	return cmd
}

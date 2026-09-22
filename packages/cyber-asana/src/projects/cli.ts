import { writeFile } from 'node:fs/promises'
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
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printTable, selectFormat } from '../output.js'
import { encodeToon } from '../toon.js'
import { isFull, truncate } from '../truncate.js'
import {
	createProject,
	deleteProject,
	exportProject,
	getProject,
	getProjectTaskCounts,
	listProjects,
	type ProjectApi,
	renderProjectMarkdown,
	searchProjects,
	updateProject,
} from './api.js'
import { buildProjectCreateFields, buildProjectUpdateFields } from './write-options.js'

function resolveProjectApi(api?: ProjectApi | (() => ProjectApi)): ProjectApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listProjects,
			getProject,
			getProjectTaskCounts,
			createProject,
			updateProject,
			deleteProject,
			searchProjects,
			exportProject,
		}
	)
}

type Project = { gid: string; name: string; permalink_url?: string; color?: string; notes?: string }

function fmtProject(p: Project) {
	printFields({
		Name: p.name,
		ID: p.gid,
		URL: p.permalink_url,
		Color: p.color || null,
		Notes: truncate(p.notes, { full: isFull() }) || null,
	})
}

function fmtProjectList(projects: Project[]) {
	printTable(
		projects,
		[
			{ label: 'Name', get: (p) => p.name },
			{ label: 'ID', get: (p) => p.gid },
		],
		{ entity: 'projects' },
	)
}

function fmtProjectCounts(projectGid: string, counts: Record<string, unknown>, usingDefaultFields: boolean) {
	if (usingDefaultFields) {
		printFields({
			'Project ID': projectGid,
			'Total Tasks': String(counts.num_tasks ?? 0),
			'Incomplete Tasks': String(counts.num_incomplete_tasks ?? 0),
			'Completed Tasks': String(counts.num_completed_tasks ?? 0),
		})
		return
	}

	printFields(
		Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value == null ? null : String(value)])),
	)
}

// Minimal default schema for project lists — principle 2. Just the fields the
// table renders, instead of Asana's larger default payload.
const PROJECT_LIST_FIELDS = 'gid,name'

const PROJECT_LIST_NEXT_STEPS = [
	'cyber-asana project get <gid> — view a project',
	'cyber-asana task list --project-gid <gid> — list a project’s tasks',
]

export function projectCommand(api?: ProjectApi | (() => ProjectApi)) {
	const cmd = new Command('project').description('Manage Asana projects')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana project list --workspace-gid <gid>',
			'  cyber-asana project get <gid> --toon',
			'  cyber-asana project counts <gid>',
			'  cyber-asana project search "launch" --workspace-gid <gid> --no-completed',
			'  cyber-asana project create "New project" --workspace-gid <gid> --notes "..."',
			'  cyber-asana project update <gid> --name "Renamed"',
			'  cyber-asana project export <gid> --output project.md',
			'  cyber-asana project delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List projects in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
	)
		.option('--archived', 'Only archived projects')
		.option('--no-archived', 'Only projects that are not archived')
		.action(
			async (opts: {
				workspace?: string
				workspaceGid?: string
				archived?: boolean
				limit?: number
				offset?: string
				optFields?: string
			}) => {
				const pagination = paginationOptionsFromCli(opts)
				pagination.optFields ??= PROJECT_LIST_FIELDS
				const data = await resolveProjectApi(api).listProjects(requiredGid(opts, 'workspace', 'Workspace GID'), {
					...pagination,
					...(opts.archived !== undefined && { archived: opts.archived }),
				})
				output(data, () => {
					const items = itemsForOutput(data)
					fmtProjectList(items)
					printCountSummary(items.length, 'project(s)')
					printNextPageHint(data)
					printNextSteps(PROJECT_LIST_NEXT_STEPS)
				})
			},
		)

	addReadOptions(cmd.command('get <gid>').description('Get a project by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveProjectApi(api).getProject(gid, readOptionsFromCli(opts))
			output(data, () => fmtProject(data))
		},
	)

	cmd
		.command('counts <gid>')
		.description('Get task counts for a project')
		.option('--opt-fields <fields>', 'Comma-separated project count fields to include')
		.action(async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveProjectApi(api).getProjectTaskCounts(
				gid,
				opts.optFields ? { optFields: opts.optFields } : undefined,
			)
			output(data, () => fmtProjectCounts(gid, data, !opts.optFields))
		})

	addGidOption(
		cmd.command('search [text]').description('Search projects in a workspace'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
		.option('--completed', 'Only completed projects')
		.option('--no-completed', 'Only incomplete projects')
		.option('--team <gid[,gid...]>', 'Team GIDs (any match)')
		.option('--owner <gid[,gid...]>', 'Owner user identifiers (any match)')
		.option('--member <gid[,gid...]>', 'Member user identifiers (any match)')
		.option('--member-not <gid[,gid...]>', 'Member user identifiers to exclude')
		.option('--portfolio <gid[,gid...]>', 'Portfolio GIDs (any match)')
		.option('--completed-on <date>', 'Exact completion date (YYYY-MM-DD)')
		.option('--completed-on-before <date>', 'Completion date before (YYYY-MM-DD)')
		.option('--completed-on-after <date>', 'Completion date after (YYYY-MM-DD)')
		.option('--completed-at-before <datetime>', 'Completion datetime before (ISO 8601)')
		.option('--completed-at-after <datetime>', 'Completion datetime after (ISO 8601)')
		.option('--created-on <date>', 'Exact creation date (YYYY-MM-DD)')
		.option('--created-on-before <date>', 'Creation date before (YYYY-MM-DD)')
		.option('--created-on-after <date>', 'Creation date after (YYYY-MM-DD)')
		.option('--created-at-before <datetime>', 'Creation datetime before (ISO 8601)')
		.option('--created-at-after <datetime>', 'Creation datetime after (ISO 8601)')
		.option('--due-on <date>', 'Exact due date (YYYY-MM-DD)')
		.option('--due-on-before <date>', 'Due date before (YYYY-MM-DD)')
		.option('--due-on-after <date>', 'Due date after (YYYY-MM-DD)')
		.option('--due-at-before <datetime>', 'Due datetime before (ISO 8601)')
		.option('--due-at-after <datetime>', 'Due datetime after (ISO 8601)')
		.option('--start-on <date>', 'Exact start date (YYYY-MM-DD)')
		.option('--start-on-before <date>', 'Start date before (YYYY-MM-DD)')
		.option('--start-on-after <date>', 'Start date after (YYYY-MM-DD)')
		.option('--sort-by <field>', 'Sort field: due_date, created_at, completed_at, modified_at')
		.option('--sort-asc', 'Sort ascending (default: descending)')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(
			async (
				text: string | undefined,
				opts: {
					workspace?: string
					workspaceGid?: string
					completed?: boolean
					team?: string
					owner?: string
					member?: string
					memberNot?: string
					portfolio?: string
					completedOn?: string
					completedOnBefore?: string
					completedOnAfter?: string
					completedAtBefore?: string
					completedAtAfter?: string
					createdOn?: string
					createdOnBefore?: string
					createdOnAfter?: string
					createdAtBefore?: string
					createdAtAfter?: string
					dueOn?: string
					dueOnBefore?: string
					dueOnAfter?: string
					dueAtBefore?: string
					dueAtAfter?: string
					startOn?: string
					startOnBefore?: string
					startOnAfter?: string
					sortBy?: string
					sortAsc?: boolean
					optFields?: string
				},
			) => {
				const data = await resolveProjectApi(api).searchProjects(requiredGid(opts, 'workspace', 'Workspace GID'), {
					text,
					completed: opts.completed,
					teamsAny: opts.team,
					ownerAny: opts.owner,
					membersAny: opts.member,
					membersNot: opts.memberNot,
					portfoliosAny: opts.portfolio,
					completedOn: opts.completedOn,
					completedOnBefore: opts.completedOnBefore,
					completedOnAfter: opts.completedOnAfter,
					completedAtBefore: opts.completedAtBefore,
					completedAtAfter: opts.completedAtAfter,
					createdOn: opts.createdOn,
					createdOnBefore: opts.createdOnBefore,
					createdOnAfter: opts.createdOnAfter,
					createdAtBefore: opts.createdAtBefore,
					createdAtAfter: opts.createdAtAfter,
					dueOn: opts.dueOn,
					dueOnBefore: opts.dueOnBefore,
					dueOnAfter: opts.dueOnAfter,
					dueAtBefore: opts.dueAtBefore,
					dueAtAfter: opts.dueAtAfter,
					startOn: opts.startOn,
					startOnBefore: opts.startOnBefore,
					startOnAfter: opts.startOnAfter,
					sortBy: opts.sortBy,
					sortAscending: opts.sortAsc,
					optFields: opts.optFields,
				})
				output(data, () => fmtProjectList(data))
			},
		)

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a new project'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
	createCmd
		.option('--archived', 'Create the project already archived')
		.option('--owner <user>', 'Project owner — a user GID, an email, or "me"')
		.option('--notes <text>', 'Project notes')
		.option('--html-notes <html>', 'Project notes as HTML')
		.option('--color <color>', 'Project color')
		.option('--privacy-setting <value>', 'Project privacy setting')
		.option('--default-view <value>', 'Project default view')
		.option(
			'--default-access-level <value>',
			'Default access for users or teams who join the project: admin, editor, commenter, viewer',
		)
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD)')
		.action(
			async (
				name: string,
				opts: {
					workspace?: string
					workspaceGid?: string
					archived?: boolean
					owner?: string
					notes?: string
					htmlNotes?: string
					color?: string
					privacySetting?: 'public_to_workspace' | 'private' | 'private_to_team'
					defaultView?: 'list' | 'board' | 'calendar' | 'timeline'
					defaultAccessLevel?: 'admin' | 'editor' | 'commenter' | 'viewer'
					dueOn?: string
					startOn?: string
				},
			) => {
				const data = await resolveProjectApi(api).createProject(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					name,
					buildProjectCreateFields({
						archived: opts.archived,
						owner: opts.owner,
						notes: opts.notes,
						htmlNotes: opts.htmlNotes,
						color: opts.color,
						privacySetting: opts.privacySetting,
						defaultView: opts.defaultView,
						defaultAccessLevel: opts.defaultAccessLevel,
						dueOn: opts.dueOn,
						startOn: opts.startOn,
					}),
				)
				output(data, () => fmtProject(data))
			},
		)

	cmd
		.command('update <gid>')
		.description('Update a project')
		.option('--name <name>', 'New name')
		.option('--archived', 'Archive the project')
		.option('--no-archived', 'Unarchive the project')
		.option('--owner <user>', 'New owner — a user GID, an email, or "me"')
		.option('--clear-owner', 'Leave the project without an owner')
		.option('--notes <text>', 'New notes')
		.option('--html-notes <html>', 'New notes as HTML')
		.option('--color <color>', 'New color')
		.option('--privacy-setting <value>', 'New project privacy setting')
		.option('--default-view <value>', 'New default view')
		.option(
			'--default-access-level <value>',
			'Default access for users or teams who join the project: admin, editor, commenter, viewer',
		)
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD)')
		.option('--clear-due-on', 'Clear the due date')
		.option('--clear-start-on', 'Clear the start date')
		.action(
			async (
				gid: string,
				opts: {
					name?: string
					archived?: boolean
					owner?: string
					clearOwner?: boolean
					notes?: string
					htmlNotes?: string
					color?: string
					privacySetting?: 'public_to_workspace' | 'private' | 'private_to_team'
					defaultView?: 'list' | 'board' | 'calendar' | 'timeline'
					defaultAccessLevel?: 'admin' | 'editor' | 'commenter' | 'viewer'
					dueOn?: string
					startOn?: string
					clearDueOn?: boolean
					clearStartOn?: boolean
				},
			) => {
				const data = await resolveProjectApi(api).updateProject(gid, {
					name: opts.name,
					...buildProjectUpdateFields({
						archived: opts.archived,
						owner: opts.owner,
						clearOwner: opts.clearOwner,
						notes: opts.notes,
						htmlNotes: opts.htmlNotes,
						color: opts.color,
						privacySetting: opts.privacySetting,
						defaultView: opts.defaultView,
						defaultAccessLevel: opts.defaultAccessLevel,
						dueOn: opts.dueOn,
						startOn: opts.startOn,
						clearDueOn: opts.clearDueOn,
						clearStartOn: opts.clearStartOn,
					}),
				})
				output(data, () => fmtProject(data))
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a project')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('project', gid, () => resolveProjectApi(api).deleteProject(gid))
			output(result, () => console.log(deleteMessage(result, 'Project')))
		})

	cmd
		.command('export <gid>')
		.description('Export a project with all sections and tasks')
		.option('--output <file>', 'Write output to a file instead of stdout')
		.action(async (gid: string, opts: { output?: string }) => {
			const data = await resolveProjectApi(api).exportProject(gid)
			const format = selectFormat()
			if (format !== 'text') {
				const serialized = format === 'toon' ? encodeToon(data) : JSON.stringify(data, null, 2)
				if (opts.output) await writeFile(opts.output, serialized, 'utf-8')
				else console.log(serialized)
			} else {
				const md = renderProjectMarkdown(data)
				if (opts.output) {
					await writeFile(opts.output, md, 'utf-8')
					console.log(`Wrote ${opts.output}`)
				} else {
					console.log(md)
				}
			}
		})

	return cmd
}

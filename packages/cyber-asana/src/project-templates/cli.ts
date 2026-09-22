import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import type { Job } from '../job-polling.js'
import { DEFAULT_JOB_POLL_INTERVAL_MS } from '../job-polling.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import { isFull, truncate } from '../truncate.js'
import type { ProjectTemplateApi } from './api.js'
import {
	DEFAULT_INSTANTIATE_TIMEOUT_SECONDS,
	getProjectTemplate,
	instantiateProject,
	instantiateProjectAndWait,
	listProjectTemplates,
	listProjectTemplatesForTeam,
	newProjectOf,
} from './api.js'
import type { ProjectTemplatePrivacySetting, RequestedDate, RequestedRole } from './gateway.js'

type ProjectTemplate = {
	gid: string
	name: string
	description?: string | null
	public?: boolean
	team?: { gid?: string; name?: string } | null
	requested_dates?: { gid?: string; name?: string; description?: string }[]
}

function resolveProjectTemplateApi(api?: ProjectTemplateApi | (() => ProjectTemplateApi)): ProjectTemplateApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listProjectTemplates,
			listProjectTemplatesForTeam,
			getProjectTemplate,
			instantiateProject,
			instantiateProjectAndWait,
		}
	)
}

// Minimal default schema — principle 2. Just the fields the table renders.
const TEMPLATE_LIST_FIELDS = 'gid,name,team.name'

const TEMPLATE_LIST_NEXT_STEPS = [
	'cyber-asana project-template get <gid> — view a template and its date variables',
	'cyber-asana project-template instantiate <gid> --name "<project name>" — start a project from it',
]

function parseTimeout(value: string) {
	const seconds = Number(value)
	if (!Number.isInteger(seconds) || seconds < 1) {
		throw new InvalidArgumentError('--timeout must be a whole number of seconds greater than 0')
	}
	return seconds
}

/** `--requested-date <template-date-gid>=<YYYY-MM-DD>`, repeatable. */
function collectRequestedDate(value: string, previous: RequestedDate[] = []): RequestedDate[] {
	const separator = value.indexOf('=')
	if (separator < 1 || separator === value.length - 1) {
		throw new InvalidArgumentError('--requested-date must be <date-variable-gid>=<value>')
	}
	return [...previous, { gid: value.slice(0, separator), value: value.slice(separator + 1) }]
}

/** `--requested-role <template-role-gid>=<user>`, repeatable. */
function collectRequestedRole(value: string, previous: RequestedRole[] = []): RequestedRole[] {
	const separator = value.indexOf('=')
	if (separator < 1 || separator === value.length - 1) {
		throw new InvalidArgumentError('--requested-role must be <template-role-gid>=<user>')
	}
	return [...previous, { gid: value.slice(0, separator), value: value.slice(separator + 1) }]
}

function fmtTemplate(template: ProjectTemplate) {
	printFields({
		Name: template.name,
		ID: template.gid,
		Team: template.team?.name ?? template.team?.gid ?? null,
		Public: template.public === undefined ? null : template.public ? 'yes' : 'no',
		Description: truncate(template.description, { full: isFull() }) || null,
	})
}

function fmtRequestedDates(dates: ProjectTemplate['requested_dates']) {
	if (!dates?.length) return
	console.log('\nDate variables (pass with --requested-date <gid>=<YYYY-MM-DD>):')
	printTable(
		dates,
		[
			{ label: 'ID', get: (d) => d.gid ?? '' },
			{ label: 'Name', get: (d) => d.name ?? '' },
		],
		{ entity: 'date variables' },
	)
}

function newProjectGid(job: Job) {
	return newProjectOf(job)?.gid
}

export function projectTemplateCommand(api?: ProjectTemplateApi | (() => ProjectTemplateApi)) {
	const cmd = new Command('project-template').description('Browse Asana project templates and start projects from them')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana project-template list --workspace-gid <gid>',
			'  cyber-asana project-template list --team-gid <gid>',
			'  cyber-asana project-template get <gid>',
			'  cyber-asana project-template instantiate <gid> --name "Acme onboarding" --team-gid <gid>',
			'  cyber-asana project-template instantiate <gid> --name "Acme onboarding" --no-wait',
			'',
			'Asana builds the project asynchronously. `instantiate` waits for the job to',
			'finish and prints the new project GID; --no-wait returns the job GID instead,',
			'which you can poll with `cyber-asana job get <gid>`.',
		].join('\n'),
	)

	const listCmd = addPaginationOptions(
		addGidOption(
			addGidOption(cmd.command('list').description('List project templates'), 'workspace', 'Workspace GID', {
				env: 'ASANA_WORKSPACE',
			}),
			'team',
			'Team GID — lists that team’s templates',
		),
	)
	listCmd.action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			team?: string
			teamGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TEMPLATE_LIST_FIELDS
			const teamGid = normalizedGid(opts, 'team')
			// A team is the narrower scope, and Asana has a dedicated endpoint for it.
			const data = teamGid
				? await resolveProjectTemplateApi(api).listProjectTemplatesForTeam(teamGid, pagination)
				: await resolveProjectTemplateApi(api).listProjectTemplates(
						{ workspace: requiredGid(opts, 'workspace', 'Workspace GID') },
						pagination,
					)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: ProjectTemplate) => t.name },
						{ label: 'ID', get: (t: ProjectTemplate) => t.gid },
						{ label: 'Team', get: (t: ProjectTemplate) => t.team?.name ?? '' },
					],
					{ entity: 'project templates' },
				)
				printCountSummary(items.length, 'project template(s)')
				printNextPageHint(data)
				printNextSteps(TEMPLATE_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a project template by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveProjectTemplateApi(api).getProjectTemplate(gid, readOptionsFromCli(opts))
			output(data, () => {
				fmtTemplate(data)
				fmtRequestedDates(data.requested_dates)
				printNextSteps([
					`cyber-asana project-template instantiate ${gid} --name "<project name>" — start a project from this template`,
				])
			})
		},
	)

	const instantiateCmd = addGidOption(
		cmd
			.command('instantiate <gid>')
			.description('Start a new project from a project template')
			.requiredOption('--name <name>', 'Name for the new project'),
		'team',
		'Team GID for the new project (required in an organization)',
	)
	instantiateCmd
		.option('--public', 'Make the new project visible to the whole team')
		.option('--private', 'Make the new project private to its members')
		.option(
			'--privacy-setting <value>',
			'Privacy of the new project: public_to_workspace, private_to_team, private (replaces --public/--private)',
		)
		.option(
			'--requested-date <gid=value>',
			'Value for a template date variable, repeatable',
			collectRequestedDate,
			undefined,
		)
		.option(
			'--requested-role <gid=user>',
			'User for a template role — a user GID, an email, or “me” — repeatable',
			collectRequestedRole,
			undefined,
		)
		.option('--strict-dates', 'Fail if any of the template’s date variables is left unfilled')
		.option('--no-wait', 'Return the job immediately instead of waiting for the project')
		.option(
			'--timeout <seconds>',
			`Seconds to wait for the job (default: ${DEFAULT_INSTANTIATE_TIMEOUT_SECONDS})`,
			parseTimeout,
		)
		.action(
			async (
				gid: string,
				opts: {
					name: string
					team?: string
					teamGid?: string
					public?: boolean
					private?: boolean
					privacySetting?: ProjectTemplatePrivacySetting
					requestedDate?: RequestedDate[]
					requestedRole?: RequestedRole[]
					strictDates?: boolean
					wait: boolean
					timeout?: number
				},
			) => {
				if (opts.public && opts.private) {
					throw new InvalidArgumentError('--public and --private cannot be used together')
				}
				if (opts.privacySetting !== undefined && (opts.public || opts.private)) {
					throw new InvalidArgumentError('--privacy-setting cannot be used with --public or --private')
				}
				const teamGid = normalizedGid(opts, 'team')
				const fields = {
					name: opts.name,
					...(teamGid !== undefined && { team: teamGid }),
					...((opts.public || opts.private) && { public: opts.public === true }),
					...(opts.privacySetting !== undefined && { privacySetting: opts.privacySetting }),
					...(opts.requestedDate !== undefined && { requestedDates: opts.requestedDate }),
					...(opts.requestedRole !== undefined && { requestedRoles: opts.requestedRole }),
					...(opts.strictDates !== undefined && { isStrict: opts.strictDates }),
				}
				const templateApi = resolveProjectTemplateApi(api)

				if (!opts.wait) {
					const job = await templateApi.instantiateProject(gid, fields)
					output(job, () => {
						printFields({ Job: job.gid ?? null, Status: job.status ?? null })
						printNextSteps([`cyber-asana job get ${job.gid} — poll until the project is ready`])
					})
					return
				}

				const job = await templateApi.instantiateProjectAndWait(gid, fields, {
					maxAttempts: opts.timeout ?? DEFAULT_INSTANTIATE_TIMEOUT_SECONDS,
					intervalMs: DEFAULT_JOB_POLL_INTERVAL_MS,
				})
				output(job, () => {
					const projectGid = newProjectGid(job)
					printFields({
						Project: projectGid ?? null,
						Name: newProjectOf(job)?.name ?? null,
						Job: job.gid ?? null,
						Status: job.status ?? null,
					})
					if (projectGid) printNextSteps([`cyber-asana project get ${projectGid} — view the new project`])
				})
			},
		)

	return cmd
}

import { Command, Option } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	type CliGidOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printNextSteps, printTable } from '../platform/cli/output.js'
import type { AiStudioApi } from './api.js'
import { listAiStudioRuns, listAiStudioSeats } from './api.js'
import { AI_STUDIO_SEAT_FILTER_STATES, type AiStudioSeatFilterState } from './gateway.js'

type Ref = { gid?: string; name?: string } | null | undefined

type AiStudioRun = {
	gid: string
	rule?: Ref
	triggered_by?: Ref
	model?: string
	status?: string
	credits_used?: number
	run_started_at?: string | null
}

type AiStudioSeat = {
	gid: string
	user?: Ref
	license?: string
	state?: string
	assigned_at?: string
}

function refLabel(ref: Ref) {
	return ref?.name ?? ref?.gid ?? ''
}

function resolveAiStudioApi(api?: AiStudioApi | (() => AiStudioApi)): AiStudioApi {
	if (typeof api === 'function') return api()
	return api ?? { listAiStudioRuns, listAiStudioSeats }
}

type ListCliOptions = CliGidOptions & {
	divisionGid?: string
	limit?: number
	offset?: string
	all?: boolean
	maxPages?: number
}

function addListOptions(cmd: Command) {
	return addPaginationOptions(
		addGidOption(
			addGidOption(cmd, 'workspace', 'Workspace or organization GID', { env: 'ASANA_WORKSPACE' }),
			'division',
			"Scope to one division (default: the org's first licensed division)",
			{ legacyAlias: false },
		),
		{ optFields: false },
	)
}

function divisionOption(opts: ListCliOptions) {
	const divisionGid = normalizedGid(opts, 'division')
	return divisionGid !== undefined ? { divisionGid } : {}
}

const RUNS_NEXT_STEPS = [
	'cyber-asana ai-studio runs --start-at <iso-datetime> — poll forward from the last recorded usage',
	'cyber-asana ai-studio seats — see who holds an AI Studio seat',
]

const SEATS_NEXT_STEPS = ['cyber-asana ai-studio runs — see the credits each AI Studio run consumed']

export function aiStudioCommand(api?: AiStudioApi | (() => AiStudioApi)) {
	const cmd = new Command('ai-studio').description('Read Asana AI Studio usage: credit runs and seats')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana ai-studio runs --workspace-gid <gid>',
			'  cyber-asana ai-studio runs --start-at 2026-01-01T00:00:00Z --all',
			'  cyber-asana ai-studio seats --state active --json',
			'',
			'Asana restricts these endpoints to service accounts in organizations licensed for AI Studio.',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addListOptions(cmd.command('runs').description('List AI Studio runs and the credits each consumed, oldest first'))
		.option('--start-at <datetime>', 'Inclusive lower bound on when usage was recorded (ISO 8601)')
		.option('--end-at <datetime>', 'Exclusive upper bound on when usage was recorded (ISO 8601)')
		.action(async (opts: ListCliOptions & { startAt?: string; endAt?: string }) => {
			const data = await resolveAiStudioApi(api).listAiStudioRuns(requiredGid(opts, 'workspace', 'Workspace GID'), {
				...paginationOptionsFromCli(opts),
				...(opts.startAt !== undefined && { startAt: opts.startAt }),
				...(opts.endAt !== undefined && { endAt: opts.endAt }),
				...divisionOption(opts),
			})
			output(data, () => {
				const items = itemsForOutput<AiStudioRun>(data)
				printTable(
					items,
					[
						{ label: 'ID', get: (r) => r.gid },
						{ label: 'Started', get: (r) => r.run_started_at ?? '' },
						{ label: 'Rule', get: (r) => refLabel(r.rule) },
						{ label: 'Triggered by', get: (r) => refLabel(r.triggered_by) },
						{ label: 'Status', get: (r) => r.status ?? '' },
						{ label: 'Credits', get: (r) => (r.credits_used === undefined ? '' : String(r.credits_used)) },
					],
					{ entity: 'AI Studio runs' },
				)
				printCountSummary(items.length, 'AI Studio run(s)')
				printNextPageHint(data)
				printNextSteps(RUNS_NEXT_STEPS)
			})
		})

	addListOptions(cmd.command('seats').description('List AI Studio seat allocations (current snapshot)'))
		.addOption(new Option('--state <state>', 'Only seats in this state').choices(AI_STUDIO_SEAT_FILTER_STATES))
		.action(async (opts: ListCliOptions & { state?: AiStudioSeatFilterState }) => {
			const data = await resolveAiStudioApi(api).listAiStudioSeats(requiredGid(opts, 'workspace', 'Workspace GID'), {
				...paginationOptionsFromCli(opts),
				...(opts.state !== undefined && { state: opts.state }),
				...divisionOption(opts),
			})
			output(data, () => {
				const items = itemsForOutput<AiStudioSeat>(data)
				printTable(
					items,
					[
						{ label: 'ID', get: (s) => s.gid },
						{ label: 'User', get: (s) => refLabel(s.user) },
						{ label: 'License', get: (s) => s.license ?? '' },
						{ label: 'State', get: (s) => s.state ?? '' },
						{ label: 'Assigned', get: (s) => s.assigned_at ?? '' },
					],
					{ entity: 'AI Studio seats' },
				)
				printCountSummary(items.length, 'AI Studio seat(s)')
				printNextPageHint(data)
				printNextSteps(SEATS_NEXT_STEPS)
			})
		})

	return cmd
}

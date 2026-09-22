import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	parseLimit,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printSummary, printTable } from '../output.js'
import { isFull, truncate } from '../truncate.js'
import type { StatusApi, StatusOverview, StatusOverviewEntry, StatusOverviewParentType } from './api.js'
import { createStatus, deleteStatus, getStatus, getStatusOverview, listStatuses } from './api.js'

type Status = { gid: string; status_type?: string; title?: string; text?: string; created_at?: string }

function fmtStatus(s: Status) {
	printFields({
		ID: s.gid,
		Type: s.status_type ?? null,
		Title: s.title ?? null,
		At: s.created_at ?? null,
		Text: truncate(s.text, { full: isFull() }) || null,
	})
}

function resolveStatusApi(api?: StatusApi | (() => StatusApi)): StatusApi {
	if (typeof api === 'function') return api()
	return api ?? { listStatuses, getStatus, createStatus, deleteStatus, getStatusOverview }
}

// Minimal default schema for status lists — principle 2. The body text is
// deliberately excluded; `status get <gid>` fetches it on demand.
const STATUS_LIST_FIELDS = 'gid,status_type,title,created_at'

const STATUS_LIST_NEXT_STEPS = ['cyber-asana status get <gid> — read a status update in full']

const STATUS_OVERVIEW_NEXT_STEPS = [
	'cyber-asana status list --parent-gid <gid> — read the full status history of one parent',
	'cyber-asana status get <gid> — read a status update in full',
]

const PARENT_TYPES: StatusOverviewParentType[] = ['project', 'portfolio']

function parseParentType(value: string): StatusOverviewParentType {
	if (!PARENT_TYPES.includes(value as StatusOverviewParentType)) {
		throw new InvalidArgumentError(`parent-type must be one of ${PARENT_TYPES.join(', ')}`)
	}
	return value as StatusOverviewParentType
}

function fmtOverviewEntry(entry: StatusOverviewEntry) {
	printFields({
		ID: entry.gid,
		Name: entry.name || null,
		Type: entry.resource_type,
		Status: entry.status?.status_type ?? 'no status update',
		'Status Title': entry.status?.title ?? null,
		'Status At': entry.status?.created_at ?? null,
		Tasks: entry.counts ? String(entry.counts.num_tasks ?? 0) : null,
		Completed: entry.counts ? String(entry.counts.num_completed_tasks ?? 0) : null,
		Incomplete: entry.counts ? String(entry.counts.num_incomplete_tasks ?? 0) : null,
		'Status Text': truncate(entry.status?.text, { full: isFull() }) || null,
	})
}

function fmtOverview(overview: StatusOverview) {
	fmtOverviewEntry(overview.parent)
	if (overview.parent.resource_type !== 'portfolio') return

	console.log('')
	printTable(
		overview.items,
		[
			{ label: 'ID', get: (i: StatusOverviewEntry) => i.gid },
			{ label: 'Name', get: (i: StatusOverviewEntry) => i.name },
			{ label: 'Type', get: (i: StatusOverviewEntry) => i.resource_type },
			{ label: 'Status', get: (i: StatusOverviewEntry) => i.status?.status_type ?? '' },
			{ label: 'Tasks', get: (i: StatusOverviewEntry) => (i.counts ? String(i.counts.num_tasks ?? 0) : '') },
			{
				label: 'Done',
				get: (i: StatusOverviewEntry) => (i.counts ? String(i.counts.num_completed_tasks ?? 0) : ''),
			},
		],
		{ entity: 'portfolio items' },
	)
	printCountSummary(overview.item_count, 'item(s) rolled up')
	if (overview.truncated) {
		printSummary(
			`\nRoll-up capped at ${overview.item_limit} items; raise --limit or page through cyber-asana portfolio items.`,
		)
	}
	printNextSteps(STATUS_OVERVIEW_NEXT_STEPS)
}

export function statusCommand(api?: StatusApi | (() => StatusApi)) {
	const cmd = new Command('status').description('Manage Asana status updates on projects, portfolios, and goals')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana status overview <project|portfolio gid>',
			'  cyber-asana status list --parent-gid <project|portfolio|goal gid>',
			'  cyber-asana status get <gid> --full',
			'  cyber-asana status create --parent-gid <gid> --status-type on_track --text "..."',
			'  cyber-asana status delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(
			cmd.command('list').description('List status updates for a project, portfolio, or goal'),
			'parent',
			'Parent GID (project, portfolio, or goal)',
		),
	)
		.option('--created-since <timestamp>', 'Only status updates created since this ISO 8601 timestamp')
		.action(
			async (opts: {
				parent?: string
				parentGid?: string
				limit?: number
				offset?: string
				optFields?: string
				createdSince?: string
			}) => {
				const pagination = paginationOptionsFromCli(opts)
				pagination.optFields ??= STATUS_LIST_FIELDS
				const data = await resolveStatusApi(api).listStatuses(requiredGid(opts, 'parent', 'Parent GID'), {
					...pagination,
					...(opts.createdSince !== undefined && { createdSince: opts.createdSince }),
				})
				output(data, () => {
					const items = itemsForOutput(data)
					printTable(
						items,
						[
							{ label: 'ID', get: (s: Status) => s.gid },
							{ label: 'Type', get: (s: Status) => s.status_type ?? '' },
							{ label: 'Title', get: (s: Status) => s.title ?? '' },
						],
						{ entity: 'status updates' },
					)
					printCountSummary(items.length, 'status update(s)')
					printNextPageHint(data)
					printNextSteps(STATUS_LIST_NEXT_STEPS)
				})
			},
		)

	cmd
		.command('overview <parent-gid>')
		.description('Roll up the latest status and task counts for a project or portfolio')
		.option('--limit <number>', 'Portfolio items to roll up, from 1 to 100 (default: 25)', parseLimit)
		.option('--parent-type <type>', 'Skip parent detection: project or portfolio', parseParentType)
		.action(async (parentGid: string, opts: { limit?: number; parentType?: StatusOverviewParentType }) => {
			const data = await resolveStatusApi(api).getStatusOverview(parentGid, {
				...(opts.limit !== undefined && { limit: opts.limit }),
				...(opts.parentType !== undefined && { parentType: opts.parentType }),
			})
			output(data, () => fmtOverview(data))
		})

	addReadOptions(cmd.command('get <gid>').description('Get a status update by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveStatusApi(api).getStatus(gid, readOptionsFromCli(opts))
			output(data, () => fmtStatus(data))
		},
	)

	addGidOption(
		cmd
			.command('create')
			.description('Create a status update on a project, portfolio, or goal')
			.requiredOption('--status-type <type>', 'Status type (e.g. on_track, at_risk, off_track, on_hold, complete)')
			.option('--text <text>', 'Status update body as plain text')
			.option('--html-text <html>', 'Status update body as Asana rich text HTML')
			.option('--title <title>', 'Status update title'),
		'parent',
		'Parent GID (project, portfolio, or goal)',
	).action(
		async (opts: {
			parent?: string
			parentGid?: string
			statusType: string
			text?: string
			htmlText?: string
			title?: string
		}) => {
			const data = await resolveStatusApi(api).createStatus(requiredGid(opts, 'parent', 'Parent GID'), {
				status_type: opts.statusType,
				...(opts.text !== undefined && { text: opts.text }),
				...(opts.htmlText !== undefined && { html_text: opts.htmlText }),
				...(opts.title !== undefined && { title: opts.title }),
			})
			output(data, () => fmtStatus(data))
		},
	)

	cmd
		.command('delete <gid>')
		.description('Delete a status update')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('status_update', gid, () => resolveStatusApi(api).deleteStatus(gid))
			output(result, () => console.log(deleteMessage(result, 'Status update')))
		})

	return cmd
}

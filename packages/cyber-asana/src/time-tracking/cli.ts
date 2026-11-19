import { Command, InvalidArgumentError, Option } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { TimeTrackingEntryApi, TimeTrackingEntryFields } from './api.js'
import { BILLABLE_STATUSES, type BillableStatus, MAX_CATEGORIES } from './billing.js'
import {
	createTimeTrackingEntry,
	deleteTimeTrackingEntry,
	getTimeTrackingEntry,
	listTimeTrackingEntries,
	listTimeTrackingEntriesForTask,
	updateTimeTrackingEntry,
} from './default.js'

type Entry = {
	gid: string
	duration_minutes?: number
	entered_on?: string
	created_by?: { name?: string } | null
	task?: { name?: string } | null
}

// Minimal default schema — principle 2. Just the fields the table renders.
const ENTRY_LIST_FIELDS = 'gid,duration_minutes,entered_on,created_by.name,task.name'

function fmtEntry(e: Entry) {
	printFields({
		ID: e.gid,
		Minutes: e.duration_minutes === undefined ? null : String(e.duration_minutes),
		On: e.entered_on ?? null,
		By: e.created_by?.name ?? null,
		Task: e.task?.name ?? null,
	})
}

function resolveTimeTrackingEntryApi(api?: TimeTrackingEntryApi | (() => TimeTrackingEntryApi)): TimeTrackingEntryApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTimeTrackingEntries,
			listTimeTrackingEntriesForTask,
			getTimeTrackingEntry,
			createTimeTrackingEntry,
			updateTimeTrackingEntry,
			deleteTimeTrackingEntry,
		}
	)
}

function parsePositive(name: string) {
	return (value: string) => {
		const n = Number(value)
		if (value.trim() === '' || !Number.isFinite(n) || n <= 0)
			throw new InvalidArgumentError(`${name} must be a positive number`)
		return n
	}
}

type WriteOpts = {
	hours?: number
	minutes?: number
	enteredOn?: string
	assignee?: string
	attributableTo?: string
	billableStatus?: BillableStatus
	category?: string[]
	description?: string
	optFields?: string
}

const ADD_ON = 'Needs the Timesheets and Budgets add-on (402 Payment Required without it)'

function addWriteOptions<T extends Command>(cmd: T) {
	return cmd
		.option('--hours <n>', 'Time spent, in hours (may be fractional)', parsePositive('--hours'))
		.option('--minutes <n>', 'Time spent, in minutes', parsePositive('--minutes'))
		.option('--entered-on <date>', 'Date the time was spent, YYYY-MM-DD (default: today)')
		.option(
			'--assignee <user-gid>',
			'User GID the time is attributed to (default: you). Another user only if you are their time reviewer or an admin',
		)
		.option('--attributable-to <project-gid>', 'Project GID the time is attributed to')
		.addOption(new Option('--billable-status <status>', `Billing status. ${ADD_ON}`).choices([...BILLABLE_STATUSES]))
		.option(
			'--category <gid>',
			`Time tracking category GID; replaces existing categories. Asana allows one. ${ADD_ON}`,
			(value: string, previous: string[] = []) => [...previous, value],
		)
		.option('--description <text>', `Note on the entry. ${ADD_ON}`)
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
}

function fieldsFrom(opts: WriteOpts): TimeTrackingEntryFields {
	if (opts.hours !== undefined && opts.minutes !== undefined) {
		throw new Error('--hours and --minutes are mutually exclusive')
	}
	if ((opts.category?.length ?? 0) > MAX_CATEGORIES) {
		throw new Error(`Give at most one --category; Asana allows ${MAX_CATEGORIES} per entry`)
	}
	const minutes = opts.minutes ?? (opts.hours !== undefined ? Math.round(opts.hours * 60) : undefined)
	return {
		...(minutes !== undefined && { durationMinutes: minutes }),
		...(opts.enteredOn !== undefined && { enteredOn: opts.enteredOn }),
		...(opts.assignee !== undefined && { assignee: opts.assignee }),
		...(opts.attributableTo !== undefined && { attributableTo: opts.attributableTo }),
		...(opts.billableStatus !== undefined && { billableStatus: opts.billableStatus }),
		...(opts.category !== undefined && { categories: opts.category }),
		...(opts.description !== undefined && { description: opts.description }),
	}
}

function printEntries(data: Parameters<typeof itemsForOutput>[0]) {
	const items = itemsForOutput(data) as Entry[]
	printTable(
		items,
		[
			{ label: 'ID', get: (e) => e.gid },
			{ label: 'Minutes', get: (e) => (e.duration_minutes === undefined ? '' : String(e.duration_minutes)) },
			{ label: 'On', get: (e) => e.entered_on ?? '' },
			{ label: 'By', get: (e) => e.created_by?.name ?? '' },
			{ label: 'Task', get: (e) => e.task?.name ?? '' },
		],
		{ entity: 'time entries' },
	)
	printCountSummary(items.length, 'time entry(ies)')
	printNextPageHint(data)
	printNextSteps(['cyber-asana time-entry get <gid> — view an entry'])
}

type ListOpts = {
	task?: string
	taskGid?: string
	user?: string
	userGid?: string
	assignee?: string
	assigneeGid?: string
	attributableTo?: string
	timesheetApprovalStatus?: string
	portfolio?: string
	portfolioGid?: string
	workspace?: string
	workspaceGid?: string
	from?: string
	to?: string
	limit?: number
	offset?: string
	optFields?: string
}

export function timeTrackingEntryCommand(api?: TimeTrackingEntryApi | (() => TimeTrackingEntryApi)) {
	const cmd = new Command('time-entry').description(
		'Log and review time spent on tasks (paid plan). Categories, timesheets, rates, and budgets are not wrapped',
	)

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana time-entry create <task-gid> --hours 1.5 --entered-on 2026-11-17',
			'  cyber-asana time-entry for-task <task-gid>',
			'  cyber-asana time-entry list --assignee <gid> --from 2026-11-01 --to 2026-11-30',
		].join('\n'),
	)

	let list = cmd
		.command('list')
		.description('List time entries across tasks, filtered by task, assignee, project, portfolio, or period')
	for (const [name, label] of [
		['task', 'Task GID'],
		['assignee', 'User GID the time is attributed to'],
		['user', 'User GID (same as --assignee; kept for older scripts)'],
		['portfolio', 'Portfolio GID'],
		['workspace', 'Workspace GID'],
	] as const) {
		list = addGidOption(list, name, label)
	}
	addPaginationOptions(
		list
			.option('--attributable-to <project-gid>', 'Only entries attributed to this project')
			.option('--timesheet-approval-status <gid>', `Only entries with this timesheet approval status. ${ADD_ON}`)
			.option('--from <date>', 'Only entries entered on or after this date (YYYY-MM-DD)')
			.option('--to <date>', 'Only entries entered on or before this date (YYYY-MM-DD)'),
	).action(async (opts: ListOpts) => {
		const pagination = paginationOptionsFromCli(opts)
		pagination.optFields ??= ENTRY_LIST_FIELDS
		const filters = {
			...(normalizedGid(opts, 'task') && { task: normalizedGid(opts, 'task') }),
			...((normalizedGid(opts, 'assignee') ?? normalizedGid(opts, 'user')) && {
				assignee: normalizedGid(opts, 'assignee') ?? normalizedGid(opts, 'user'),
			}),
			...(opts.attributableTo !== undefined && { attributableTo: opts.attributableTo }),
			...(opts.timesheetApprovalStatus !== undefined && { timesheetApprovalStatus: opts.timesheetApprovalStatus }),
			...(normalizedGid(opts, 'portfolio') && { portfolio: normalizedGid(opts, 'portfolio') }),
			...(normalizedGid(opts, 'workspace') && { workspace: normalizedGid(opts, 'workspace') }),
			...(opts.from !== undefined && { enteredOnStart: opts.from }),
			...(opts.to !== undefined && { enteredOnEnd: opts.to }),
		}
		const data = await resolveTimeTrackingEntryApi(api).listTimeTrackingEntries(filters, pagination)
		output(data, () => printEntries(data))
	})

	addPaginationOptions(cmd.command('for-task <task-gid>').description("List a task's time entries")).action(
		async (taskGid: string, opts: ListOpts) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= ENTRY_LIST_FIELDS
			const data = await resolveTimeTrackingEntryApi(api).listTimeTrackingEntriesForTask(taskGid, pagination)
			output(data, () => printEntries(data))
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a time entry by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveTimeTrackingEntryApi(api).getTimeTrackingEntry(gid, readOptionsFromCli(opts))
			output(data, () => fmtEntry(data as Entry))
		},
	)

	addWriteOptions(cmd.command('create <task-gid>').description('Log time against a task')).action(
		async (taskGid: string, opts: WriteOpts) => {
			const fields = fieldsFrom(opts)
			if (fields.durationMinutes === undefined) throw new Error('Give the time spent with --hours or --minutes')
			const data = await resolveTimeTrackingEntryApi(api).createTimeTrackingEntry(
				taskGid,
				fields,
				readOptionsFromCli(opts),
			)
			output(data, () => {
				fmtEntry(data as Entry)
				printNextSteps([`cyber-asana time-entry for-task ${taskGid} — list the task's entries`])
			})
		},
	)

	addWriteOptions(cmd.command('update <gid>').description('Correct a time entry; give at least one field')).action(
		async (gid: string, opts: WriteOpts) => {
			const fields = fieldsFrom(opts)
			if (Object.keys(fields).length === 0) {
				throw new Error(
					'Nothing to update: give at least one of --hours, --minutes, --entered-on, --assignee, --attributable-to, --billable-status, --category, --description',
				)
			}
			const data = await resolveTimeTrackingEntryApi(api).updateTimeTrackingEntry(gid, fields, readOptionsFromCli(opts))
			output(data, () => fmtEntry(data as Entry))
		},
	)

	cmd
		.command('delete <gid>')
		.description('Delete a time entry (succeeds when it is already gone)')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('time_tracking_entry', gid, () =>
				resolveTimeTrackingEntryApi(api).deleteTimeTrackingEntry(gid),
			)
			output(result, () => console.log(deleteMessage(result, 'Time entry')))
		})

	return cmd
}

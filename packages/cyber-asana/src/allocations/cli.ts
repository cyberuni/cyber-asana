import { Command, Option } from 'commander'
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
import type { AllocationApi } from './api.js'
import { createAllocation, deleteAllocation, getAllocation, listAllocations, updateAllocation } from './default.js'
import type { Allocation, AllocationEffort } from './gateway.js'

function who(ref?: { gid?: string; name?: string } | null) {
	return ref?.name ?? ref?.gid ?? ''
}

function effortText(effort: Allocation['effort']) {
	if (!effort || effort.value === undefined) return ''
	return `${effort.value} ${effort.type === 'percent' ? '%' : 'hours'}`.replace(' %', '%')
}

function fmtAllocation(a: Allocation) {
	printFields({
		ID: a.gid,
		Assignee: who(a.assignee) || null,
		Project: who(a.parent) || null,
		Start: a.start_date ?? null,
		End: a.end_date ?? null,
		Effort: effortText(a.effort) || null,
	})
}

function resolveAllocationApi(api?: AllocationApi | (() => AllocationApi)): AllocationApi {
	if (typeof api === 'function') return api()
	return api ?? { listAllocations, getAllocation, createAllocation, updateAllocation, deleteAllocation }
}

// Minimal default schema — principle 2. Just the fields the table renders.
const ALLOCATION_LIST_FIELDS = 'gid,assignee.name,parent.name,start_date,end_date,effort.type,effort.value'

const ALLOCATION_LIST_NEXT_STEPS = [
	'cyber-asana allocation create --assignee <gid> --parent <project-gid> --start-date <date> --end-date <date> --percent <n> — allocate someone to a project',
	'cyber-asana allocation get <gid> — view an allocation',
]

function effortOptions<T extends Command>(cmd: T) {
	return cmd
		.addOption(
			new Option('--percent <n>', 'Effort as a percentage of working time').argParser(Number).conflicts('hours'),
		)
		.addOption(new Option('--hours <n>', 'Effort in hours').argParser(Number).conflicts('percent'))
}

function effortFromCli(opts: { percent?: number; hours?: number }): AllocationEffort | undefined {
	if (opts.percent !== undefined) return { type: 'percent', value: opts.percent }
	if (opts.hours !== undefined) return { type: 'hours', value: opts.hours }
	return undefined
}

type Dates = { startDate?: string; endDate?: string }

export function allocationCommand(api?: AllocationApi | (() => AllocationApi)) {
	const cmd = new Command('allocation').description(
		'Manage Asana allocations: how much of a person is committed to a project (resource management; plan-limited)',
	)

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana allocation list --assignee me',
			'  cyber-asana allocation list --parent <project-gid> --toon',
			'  cyber-asana allocation create --assignee <gid> --parent <project-gid> --start-date 2026-01-05 --end-date 2026-01-18 --percent 50',
			'  cyber-asana allocation update <gid> --hours 20',
			'  cyber-asana allocation delete <gid>',
			'',
			'Dates are ISO 8601 days (YYYY-MM-DD). A workspace whose plan has no resource management answers 402 (exit 7).',
		].join('\n'),
	)

	const listCmd = addPaginationOptions(
		addGidOption(
			cmd.command('list').description('List allocations, filtered by project, person, or workspace'),
			'workspace',
			'Workspace GID',
		),
	)
	listCmd
		.option('--parent <gid>', 'Only allocations on this project')
		.option('--assignee <gid>', 'Only allocations of this user (me for yourself)')
		.action(
			async (opts: {
				parent?: string
				assignee?: string
				workspace?: string
				workspaceGid?: string
				limit?: number
				offset?: string
				optFields?: string
			}) => {
				const pagination = paginationOptionsFromCli(opts)
				pagination.optFields ??= ALLOCATION_LIST_FIELDS
				const workspace = normalizedGid(opts, 'workspace')
				const data = await resolveAllocationApi(api).listAllocations({
					...pagination,
					...(opts.parent !== undefined && { parent: opts.parent }),
					...(opts.assignee !== undefined && { assignee: opts.assignee }),
					...(workspace !== undefined && { workspace }),
				})
				output(data, () => {
					const items = itemsForOutput<Allocation>(data)
					printTable(
						items,
						[
							{ label: 'ID', get: (a) => a.gid },
							{ label: 'Assignee', get: (a) => who(a.assignee) },
							{ label: 'Project', get: (a) => who(a.parent) },
							{ label: 'Start', get: (a) => a.start_date ?? '' },
							{ label: 'End', get: (a) => a.end_date ?? '' },
							{ label: 'Effort', get: (a) => effortText(a.effort) },
						],
						{ entity: 'allocations' },
					)
					printCountSummary(items.length, 'allocation(s)')
					printNextPageHint(data)
					printNextSteps(ALLOCATION_LIST_NEXT_STEPS)
				})
			},
		)

	addReadOptions(cmd.command('get <gid>').description('Get an allocation by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveAllocationApi(api).getAllocation(gid, readOptionsFromCli(opts))
			output(data, () => fmtAllocation(data))
		},
	)

	const createCmd = cmd
		.command('create')
		.description('Allocate a person to a project for a date range')
		.requiredOption('--assignee <gid>', 'User GID to allocate (me for yourself)')
		.requiredOption('--parent <gid>', 'Project GID the allocation is on')
		.requiredOption('--start-date <date>', 'First day (YYYY-MM-DD)')
		.requiredOption('--end-date <date>', 'Last day (YYYY-MM-DD)')
	effortOptions(createCmd).action(
		async (opts: Dates & { assignee: string; parent: string; percent?: number; hours?: number }) => {
			const effort = effortFromCli(opts)
			const data = await resolveAllocationApi(api).createAllocation({
				assignee: opts.assignee,
				parent: opts.parent,
				start_date: opts.startDate as string,
				end_date: opts.endDate as string,
				...(effort && { effort }),
			})
			output(data, () => fmtAllocation(data))
		},
	)

	const updateCmd = cmd
		.command('update <gid>')
		.description('Update an allocation')
		.option('--start-date <date>', 'New first day (YYYY-MM-DD)')
		.option('--end-date <date>', 'New last day (YYYY-MM-DD)')
	effortOptions(updateCmd).action(async (gid: string, opts: Dates & { percent?: number; hours?: number }) => {
		const effort = effortFromCli(opts)
		const data = await resolveAllocationApi(api).updateAllocation(gid, {
			...(opts.startDate !== undefined && { start_date: opts.startDate }),
			...(opts.endDate !== undefined && { end_date: opts.endDate }),
			...(effort && { effort }),
		})
		output(data, () => fmtAllocation(data))
	})

	cmd
		.command('delete <gid>')
		.description('Delete an allocation (already gone is success)')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('allocation', gid, () => resolveAllocationApi(api).deleteAllocation(gid))
			output(result, () => console.log(deleteMessage(result, 'Allocation')))
		})

	return cmd
}

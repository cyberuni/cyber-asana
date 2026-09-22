import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	type CliGidOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import type { OooApi } from './api.js'
import { createOooEntry, deleteOooEntry, getOooEntry, listOooEntries, updateOooEntry } from './api.js'

type OooEntry = {
	gid: string
	start_date?: string
	end_date?: string
	user?: { gid?: string; name?: string } | null
	created_by?: { gid?: string; name?: string } | null
}

function fmtEntry(e: OooEntry) {
	printFields({
		ID: e.gid,
		User: e.user?.name ?? e.user?.gid ?? null,
		Start: e.start_date ?? null,
		End: e.end_date ?? null,
		'Created by': e.created_by?.name ?? null,
	})
}

function fmtEntryList(entries: OooEntry[]) {
	printTable(
		entries,
		[
			{ label: 'ID', get: (e) => e.gid },
			{ label: 'User', get: (e) => e.user?.name ?? e.user?.gid ?? '' },
			{ label: 'Start', get: (e) => e.start_date ?? '' },
			{ label: 'End', get: (e) => e.end_date ?? '' },
		],
		{ entity: 'out-of-office entries' },
	)
}

function resolveOooApi(api?: OooApi | (() => OooApi)): OooApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listOooEntries,
			getOooEntry,
			createOooEntry,
			updateOooEntry,
			deleteOooEntry,
		}
	)
}

// Minimal default schema — principle 2. Just the fields the table renders.
const OOO_LIST_FIELDS = 'gid,start_date,end_date,user.name'

const OOO_LIST_NEXT_STEPS = [
	'cyber-asana ooo create --start-date <date> --end-date <date> — mark yourself out of office',
	'cyber-asana ooo get <gid> — view an out-of-office entry',
]

/**
 * Asana takes `me` wherever a user GID goes, so an unscoped call reads the
 * caller's own calendar rather than failing for a missing flag.
 */
function userGidOrMe(opts: CliGidOptions) {
	return normalizedGid(opts, 'user') ?? 'me'
}

function requiredDate(value: string | undefined, flag: string) {
	if (!value) throw new InvalidArgumentError(`${flag} is required`)
	return value
}

export function oooCommand(api?: OooApi | (() => OooApi)) {
	const cmd = new Command('ooo').description('Manage Asana out-of-office entries')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana ooo list --workspace-gid <gid>',
			'  cyber-asana ooo list --user-gid <gid> --start-date 2026-01-01 --end-date 2026-01-31',
			'  cyber-asana ooo get <gid> --toon',
			'  cyber-asana ooo create --start-date 2026-01-01 --end-date 2026-01-15',
			'  cyber-asana ooo update <gid> --end-date 2026-01-20',
			'  cyber-asana ooo delete <gid>',
			'',
			'Dates are ISO 8601 days (YYYY-MM-DD). --user-gid defaults to the authenticated user.',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	const listCmd = addPaginationOptions(
		addGidOption(
			addGidOption(
				cmd.command('list').description('List out-of-office entries for a user'),
				'user',
				'User GID (default: the authenticated user)',
			),
			'workspace',
			'Workspace GID',
			{ env: 'ASANA_WORKSPACE' },
		),
	)
	listCmd
		.option('--start-date <date>', 'Only entries overlapping with or ending after this date (YYYY-MM-DD)')
		.option('--end-date <date>', 'Only entries overlapping with or starting before this date (YYYY-MM-DD)')
	listCmd.action(
		async (opts: {
			user?: string
			userGid?: string
			workspace?: string
			workspaceGid?: string
			startDate?: string
			endDate?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= OOO_LIST_FIELDS
			const data = await resolveOooApi(api).listOooEntries(
				userGidOrMe(opts),
				requiredGid(opts, 'workspace', 'Workspace GID'),
				{
					...pagination,
					...(opts.startDate !== undefined && { startDate: opts.startDate }),
					...(opts.endDate !== undefined && { endDate: opts.endDate }),
				},
			)
			output(data, () => {
				const items = itemsForOutput(data)
				fmtEntryList(items)
				printCountSummary(items.length, 'out-of-office entr(ies)')
				printNextPageHint(data)
				printNextSteps(OOO_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get an out-of-office entry by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveOooApi(api).getOooEntry(gid, readOptionsFromCli(opts))
			output(data, () => fmtEntry(data))
		},
	)

	const createCmd = addGidOption(
		addGidOption(
			cmd.command('create').description('Create an out-of-office entry'),
			'user',
			'User GID (default: the authenticated user)',
		),
		'workspace',
		'Workspace GID',
		{ env: 'ASANA_WORKSPACE' },
	)
	createCmd
		.option('--start-date <date>', 'First day out of office (YYYY-MM-DD)')
		.option('--end-date <date>', 'Last day out of office (YYYY-MM-DD)')
	createCmd.action(
		async (opts: {
			user?: string
			userGid?: string
			workspace?: string
			workspaceGid?: string
			startDate?: string
			endDate?: string
		}) => {
			const data = await resolveOooApi(api).createOooEntry(
				userGidOrMe(opts),
				requiredGid(opts, 'workspace', 'Workspace GID'),
				{
					start_date: requiredDate(opts.startDate, '--start-date'),
					end_date: requiredDate(opts.endDate, '--end-date'),
				},
			)
			output(data, () => fmtEntry(data))
		},
	)

	cmd
		.command('update <gid>')
		.description('Update an out-of-office entry')
		.option('--start-date <date>', 'New first day out of office (YYYY-MM-DD)')
		.option('--end-date <date>', 'New last day out of office (YYYY-MM-DD)')
		.action(async (gid: string, opts: { startDate?: string; endDate?: string }) => {
			const data = await resolveOooApi(api).updateOooEntry(gid, {
				...(opts.startDate !== undefined && { start_date: opts.startDate }),
				...(opts.endDate !== undefined && { end_date: opts.endDate }),
			})
			output(data, () => fmtEntry(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete an out-of-office entry')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('ooo_entry', gid, () => resolveOooApi(api).deleteOooEntry(gid))
			output(result, () => console.log(deleteMessage(result, 'Out-of-office entry')))
		})

	return cmd
}

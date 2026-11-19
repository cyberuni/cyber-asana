import { Command, InvalidArgumentError, Option } from 'commander'
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
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import { parseAccessLevel } from '../tables/write-options.js'
import type { RecordApi, RecordSearchFilters, TableRecord, UpdateRecordFields } from './api.js'
import {
	createRecord,
	createRecordStory,
	deleteRecord,
	getRecord,
	listRecordStories,
	listRecords,
	searchRecords,
	updateRecord,
} from './default.js'
import { collectField, customFieldsFromCli } from './write-options.js'

function resolveRecordApi(api?: RecordApi | (() => RecordApi)): RecordApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listRecords,
			searchRecords,
			getRecord,
			createRecord,
			updateRecord,
			deleteRecord,
			listRecordStories,
			createRecordStory,
		}
	)
}

type Story = {
	gid: string
	created_at?: string
	resource_subtype?: string
	text?: string
	created_by?: { name?: string }
}

function fmtRecord(r: TableRecord) {
	printFields({
		Name: r.name ?? null,
		ID: r.gid,
		Table: r.table?.name ?? r.table?.gid ?? null,
		URL: r.permalink_url ?? null,
	})
	for (const f of r.custom_fields ?? []) {
		if (f.display_value != null) printFields({ [f.name ?? f.gid]: f.display_value })
	}
}

// Minimal default schemas for lists — principle 2.
const RECORD_LIST_FIELDS = 'gid,name'
const STORY_LIST_FIELDS = 'gid,created_at,resource_subtype,text'

const RECORD_LIST_NEXT_STEPS = [
	'cyber-asana record get <gid> --opt-fields custom_fields.name,custom_fields.display_value — view a record with its fields',
	'cyber-asana record stories list <gid> — comments on a record',
]

const commaList = (value: string) =>
	value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean)

function parseSortBy<T extends string>(allowed: readonly T[]) {
	return (value: string): T => {
		if (!(allowed as readonly string[]).includes(value)) {
			throw new InvalidArgumentError(`--sort-by must be ${allowed.join(' or ')}`)
		}
		return value as T
	}
}

function addFieldOptions<T extends Command>(cmd: T) {
	return cmd
		.addOption(
			new Option(
				'--field <gid=value>',
				'Set a custom field value (repeatable); the table must already have the field',
			).argParser(collectField),
		)
		.option('--fields-json <json>', 'Custom field values as a JSON object of custom field GID to value')
}

export function recordCommand(api?: RecordApi | (() => RecordApi)) {
	const cmd = new Command('record').description(
		'Manage records (rows) of Asana Tables (Advanced, Enterprise, and Enterprise+ plans)',
	)

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana record list <table-gid>',
			'  cyber-asana record search --workspace-gid <gid> --text Renewal --table <table-gid>',
			'  cyber-asana record get <gid> --opt-fields custom_fields.name,custom_fields.display_value',
			'  cyber-asana record create "Q3 renewal" --table <table-gid> --field <field-gid>=Acme --fingerprint q3-acme',
			'  cyber-asana record update <gid> --field <field-gid>=Globex',
			'  cyber-asana record stories create <gid> --text "Sent the quote"',
			'',
			'--fingerprint makes a create fail with 409 when the table already holds that fingerprint.',
			'Search is a paid-plan feature, returns one unstable page, and lags writes by 10 to 60 seconds; use list to read your own write.',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(cmd.command('list <table-gid>').description('List the records of a table'))
		.addOption(
			new Option('--sort-by <field>', 'Sort order; Asana accepts only created_at here').argParser(
				parseSortBy(['created_at']),
			),
		)
		.option('--modified-since <datetime>', 'Only records modified since this ISO 8601 date-time')
		.action(
			async (
				tableGid: string,
				opts: {
					limit?: number
					offset?: string
					optFields?: string
					sortBy?: 'created_at'
					modifiedSince?: string
				},
			) => {
				const pagination = paginationOptionsFromCli(opts)
				pagination.optFields ??= RECORD_LIST_FIELDS
				const data = await resolveRecordApi(api).listRecords(
					tableGid,
					{
						...(opts.sortBy && { sortBy: opts.sortBy }),
						...(opts.modifiedSince && { modifiedSince: opts.modifiedSince }),
					},
					pagination,
				)
				output(data, () => {
					const items = itemsForOutput(data)
					printTable(
						items,
						[
							{ label: 'Name', get: (r: TableRecord) => r.name ?? '' },
							{ label: 'ID', get: (r: TableRecord) => r.gid },
						],
						{ entity: 'records' },
					)
					printCountSummary(items.length, 'record(s)')
					printNextPageHint(data)
					printNextSteps(RECORD_LIST_NEXT_STEPS)
				})
			},
		)

	addGidOption(
		cmd.command('search').description('Search records across the tables of a workspace (paid plan)'),
		'workspace',
		'Workspace GID',
	)
		.option('--text <text>', 'Full-text search on the record name')
		.option('--table <gids>', 'Only records in any of these tables (comma-separated GIDs)', commaList)
		.option('--exclude-table <gids>', 'Skip records in these tables (comma-separated GIDs)', commaList)
		.option('--team <gids>', 'Only records of these teams (comma-separated GIDs)', commaList)
		.option('--follower <users>', 'Only records followed by any of these users (GIDs, emails, or me)', commaList)
		.option('--created-after <datetime>', 'Created after this ISO 8601 date-time')
		.option('--created-before <datetime>', 'Created before this ISO 8601 date-time')
		.addOption(
			new Option('--sort-by <field>', 'created_at or modified_at (Asana defaults to modified_at)').argParser(
				parseSortBy(['created_at', 'modified_at']),
			),
		)
		.option('--ascending', 'Sort oldest first (Asana defaults to newest first)')
		.option('--limit <number>', 'Results to return, from 1 to 100 (default: 100)', parseLimit)
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(
			async (opts: {
				workspace?: string
				workspaceGid?: string
				text?: string
				table?: string[]
				excludeTable?: string[]
				team?: string[]
				follower?: string[]
				createdAfter?: string
				createdBefore?: string
				sortBy?: 'created_at' | 'modified_at'
				ascending?: boolean
				limit?: number
				optFields?: string
			}) => {
				const filters: RecordSearchFilters = {
					...(opts.text && { text: opts.text }),
					...(opts.table && { tablesAny: opts.table }),
					...(opts.excludeTable && { tablesNot: opts.excludeTable }),
					...(opts.team && { teamsAny: opts.team }),
					...(opts.follower && { followersAny: opts.follower }),
					...(opts.createdAfter && { createdAtAfter: opts.createdAfter }),
					...(opts.createdBefore && { createdAtBefore: opts.createdBefore }),
					...(opts.sortBy && { sortBy: opts.sortBy }),
					...(opts.ascending && { sortAscending: true }),
				}
				const data = await resolveRecordApi(api).searchRecords(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					filters,
					{
						limit: opts.limit,
						optFields: opts.optFields ?? RECORD_LIST_FIELDS,
					},
				)
				output(data, () => {
					printTable(
						data,
						[
							{ label: 'Name', get: (r: TableRecord) => r.name ?? '' },
							{ label: 'ID', get: (r: TableRecord) => r.gid },
						],
						{ entity: 'records' },
					)
					printCountSummary(data.length, 'record(s)')
					printNextSteps(RECORD_LIST_NEXT_STEPS)
				})
			},
		)

	addReadOptions(cmd.command('get <gid>').description('Get a record by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveRecordApi(api).getRecord(gid, readOptionsFromCli(opts))
			output(data, () => fmtRecord(data))
		},
	)

	addFieldOptions(
		addGidOption(cmd.command('create <name>').description('Create a record in a table'), 'table', 'Table GID'),
	)
		.option('--fingerprint <value>', 'Unique fingerprint: a duplicate in the same table fails with 409')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(
			async (
				name: string,
				opts: {
					table?: string
					tableGid?: string
					field?: Record<string, string>
					fieldsJson?: string
					fingerprint?: string
					optFields?: string
				},
			) => {
				const customFields = customFieldsFromCli(opts)
				const data = await resolveRecordApi(api).createRecord(
					requiredGid(opts, 'table', 'Table GID'),
					name,
					{
						...(customFields && { customFields }),
						...(opts.fingerprint && { uniqueFingerprint: opts.fingerprint }),
					},
					readOptionsFromCli(opts),
				)
				output(data, () => fmtRecord(data))
			},
		)

	addFieldOptions(cmd.command('update <gid>').description('Update a record'))
		.option('--name <name>', 'New name')
		.option('--default-access-level <level>', 'Default access for new members: admin, editor, commenter, viewer')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(
			async (
				gid: string,
				opts: {
					name?: string
					field?: Record<string, string>
					fieldsJson?: string
					defaultAccessLevel?: string
					optFields?: string
				},
			) => {
				const customFields = customFieldsFromCli(opts)
				const fields: UpdateRecordFields = {
					...(opts.name !== undefined && { name: opts.name }),
					...(customFields && { custom_fields: customFields }),
					...(opts.defaultAccessLevel !== undefined && {
						default_access_level: parseAccessLevel(opts.defaultAccessLevel),
					}),
				}
				if (Object.keys(fields).length === 0) {
					throw new InvalidArgumentError(
						'nothing to update: pass --name, --field, --fields-json, or --default-access-level',
					)
				}
				const data = await resolveRecordApi(api).updateRecord(gid, fields, readOptionsFromCli(opts))
				output(data, () => fmtRecord(data))
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a record')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('record', gid, () => resolveRecordApi(api).deleteRecord(gid))
			output(result, () => console.log(deleteMessage(result, 'Record')))
		})

	const storiesCmd = cmd.command('stories').description('Read and add comments on a record')

	addPaginationOptions(storiesCmd.command('list <record-gid>').description("List a record's stories"))
		.option('--comments-only', 'Only comments, not activity')
		.option(
			'--created-after <datetime>',
			'Only stories created after this ISO 8601 date-time (exclusive, second granularity)',
		)
		.option('--newest-first', 'Newest first (Asana defaults to oldest first)')
		.action(
			async (
				recordGid: string,
				opts: {
					limit?: number
					offset?: string
					optFields?: string
					commentsOnly?: boolean
					createdAfter?: string
					newestFirst?: boolean
				},
			) => {
				const pagination = paginationOptionsFromCli(opts)
				pagination.optFields ??= STORY_LIST_FIELDS
				const data = await resolveRecordApi(api).listRecordStories(
					recordGid,
					{
						...(opts.commentsOnly && { commentsOnly: true }),
						...(opts.createdAfter && { createdAfter: opts.createdAfter }),
						...(opts.newestFirst && { sortAscending: false }),
					},
					pagination,
				)
				output(data, () => {
					const items = itemsForOutput(data)
					printTable(
						items,
						[
							{ label: 'When', get: (s: Story) => s.created_at ?? '' },
							{ label: 'Type', get: (s: Story) => s.resource_subtype ?? '' },
							{ label: 'Text', get: (s: Story) => s.text ?? '' },
							{ label: 'ID', get: (s: Story) => s.gid },
						],
						{ entity: 'stories' },
					)
					printCountSummary(items.length, 'story(ies)')
					printNextPageHint(data)
				})
			},
		)

	storiesCmd
		.command('create <record-gid>')
		.description('Add a comment to a record (Asana allows only comments here)')
		.option('--text <text>', 'Comment text')
		.option('--html-text <html>', 'Comment as Asana rich text HTML')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(async (recordGid: string, opts: { text?: string; htmlText?: string; optFields?: string }) => {
			if (!opts.text && !opts.htmlText) throw new InvalidArgumentError('pass --text or --html-text')
			const data = await resolveRecordApi(api).createRecordStory(
				recordGid,
				{
					...(opts.text && { text: opts.text }),
					...(opts.htmlText && { html_text: opts.htmlText }),
				},
				readOptionsFromCli(opts),
			)
			output(data, () => console.log(`Added a comment to record ${recordGid} (story ${data.gid})`))
		})

	return cmd
}

import { Command, InvalidArgumentError } from 'commander'
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
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { Table, TableApi, TableFieldSetting } from './api.js'
import {
	addTableField,
	createTable,
	deleteTable,
	getTable,
	listTableFields,
	listTables,
	removeTableField,
	updateTable,
} from './default.js'
import { parseAccessLevel } from './write-options.js'

function resolveTableApi(api?: TableApi | (() => TableApi)): TableApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTables,
			getTable,
			createTable,
			updateTable,
			deleteTable,
			listTableFields,
			addTableField,
			removeTableField,
		}
	)
}

function fmtTable(t: Table) {
	printFields({
		Name: t.name ?? null,
		ID: t.gid,
		Workspace: t.workspace?.gid ?? null,
		'Default access': t.default_access_level ?? null,
		Fields: t.custom_field_settings ? String(t.custom_field_settings.length) : null,
	})
}

// Minimal default schemas for lists — principle 2.
const TABLE_LIST_FIELDS = 'gid,name'
const TABLE_FIELD_LIST_FIELDS = 'gid,custom_field.name,custom_field.resource_subtype,is_important'

const TABLE_LIST_NEXT_STEPS = [
	'cyber-asana table get <gid> — view a table and its fields',
	'cyber-asana record list <table-gid> — list the records of a table',
]

export function tableCommand(api?: TableApi | (() => TableApi)) {
	const cmd = new Command('table').description(
		'Manage Asana Tables (Advanced, Enterprise, and Enterprise+ plans); not the HTML <table> tag in rich text',
	)

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana table list --workspace-gid <gid>',
			'  cyber-asana table get <gid> --toon',
			'  cyber-asana table create "Renewals" --workspace-gid <gid>',
			'  cyber-asana table add-field <table-gid> <custom-field-gid>',
			'  cyber-asana table delete <gid>',
			'',
			'Only custom fields that are global to the workspace can be added to a table.',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List tables in a workspace'), 'workspace', 'Workspace GID'),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TABLE_LIST_FIELDS
			const data = await resolveTableApi(api).listTables(requiredGid(opts, 'workspace', 'Workspace GID'), pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: Table) => t.name ?? '' },
						{ label: 'ID', get: (t: Table) => t.gid },
					],
					{ entity: 'tables' },
				)
				printCountSummary(items.length, 'table(s)')
				printNextPageHint(data)
				printNextSteps(TABLE_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a table by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveTableApi(api).getTable(gid, readOptionsFromCli(opts))
			output(data, () => fmtTable(data))
		},
	)

	addReadOptions(
		addGidOption(cmd.command('create <name>').description('Create a table'), 'workspace', 'Workspace GID'),
	).action(async (name: string, opts: { workspace?: string; workspaceGid?: string; optFields?: string }) => {
		const data = await resolveTableApi(api).createTable(
			requiredGid(opts, 'workspace', 'Workspace GID'),
			name,
			readOptionsFromCli(opts),
		)
		output(data, () => fmtTable(data))
	})

	addReadOptions(
		cmd
			.command('update <gid>')
			.description('Update a table')
			.option('--name <name>', 'New name')
			.option('--default-access-level <level>', 'Default access for new members: admin, editor, commenter, viewer'),
	).action(async (gid: string, opts: { name?: string; defaultAccessLevel?: string; optFields?: string }) => {
		const fields = {
			...(opts.name !== undefined && { name: opts.name }),
			...(opts.defaultAccessLevel !== undefined && {
				default_access_level: parseAccessLevel(opts.defaultAccessLevel),
			}),
		}
		if (Object.keys(fields).length === 0) {
			throw new InvalidArgumentError('nothing to update: pass --name or --default-access-level')
		}
		const data = await resolveTableApi(api).updateTable(gid, fields, readOptionsFromCli(opts))
		output(data, () => fmtTable(data))
	})

	cmd
		.command('delete <gid>')
		.description('Delete a table and its records')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('table', gid, () => resolveTableApi(api).deleteTable(gid))
			output(result, () => console.log(deleteMessage(result, 'Table')))
		})

	addPaginationOptions(
		cmd.command('fields <gid>').description("List a table's fields (its custom field settings)"),
	).action(async (gid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
		const pagination = paginationOptionsFromCli(opts)
		pagination.optFields ??= TABLE_FIELD_LIST_FIELDS
		const data = await resolveTableApi(api).listTableFields(gid, pagination)
		output(data, () => {
			const items = itemsForOutput(data)
			printTable(
				items,
				[
					{ label: 'Field', get: (s: TableFieldSetting) => s.custom_field?.name ?? '' },
					{ label: 'Field ID', get: (s: TableFieldSetting) => s.custom_field?.gid ?? '' },
					{ label: 'Type', get: (s: TableFieldSetting) => s.custom_field?.resource_subtype ?? '' },
					{ label: 'Important', get: (s: TableFieldSetting) => (s.is_important ? 'yes' : '') },
				],
				{ entity: 'table fields' },
			)
			printCountSummary(items.length, 'field(s)')
			printNextPageHint(data)
		})
	})

	addReadOptions(
		cmd
			.command('add-field <gid> <custom-field-gid>')
			.description('Add a workspace-global custom field to a table (a table holds up to 150)')
			.option('--important', 'Mark the field important to the table')
			.option('--insert-before <setting-gid>', 'Place before this custom field setting')
			.option('--insert-after <setting-gid>', 'Place after this custom field setting'),
	).action(
		async (
			gid: string,
			customFieldGid: string,
			opts: { important?: boolean; insertBefore?: string; insertAfter?: string; optFields?: string },
		) => {
			if (opts.insertBefore && opts.insertAfter) {
				throw new InvalidArgumentError('--insert-before and --insert-after cannot be used together')
			}
			const data = await resolveTableApi(api).addTableField(
				gid,
				customFieldGid,
				{
					...(opts.important && { isImportant: true }),
					...(opts.insertBefore && { insertBefore: opts.insertBefore }),
					...(opts.insertAfter && { insertAfter: opts.insertAfter }),
				},
				readOptionsFromCli(opts),
			)
			output(data, () => console.log(`Added custom field ${customFieldGid} to table ${gid}`))
		},
	)

	cmd
		.command('remove-field <gid> <custom-field-gid>')
		.description('Remove a custom field from a table')
		.action(async (gid: string, customFieldGid: string) => {
			await resolveTableApi(api).removeTableField(gid, customFieldGid)
			output({ removed: true, table: gid, custom_field: customFieldGid }, () =>
				console.log(`Removed custom field ${customFieldGid} from table ${gid}`),
			)
		})

	return cmd
}

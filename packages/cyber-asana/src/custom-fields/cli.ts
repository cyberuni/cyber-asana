import { Command, Option } from 'commander'
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
import { isFull, truncate } from '../platform/truncate.js'
import type { CreateCustomFieldInput, CustomFieldApi } from './api.js'
import {
	attachCustomField,
	createCustomField,
	createEnumOption,
	detachCustomField,
	getCustomField,
	insertEnumOption,
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
	listCustomFields,
	updateEnumOption,
} from './default.js'

type EnumOption = { gid: string; name?: string; enabled?: boolean }
type CustomField = {
	gid: string
	name?: string
	resource_subtype?: string
	description?: string
	enum_options?: EnumOption[]
}

const FIELD_TYPES = ['text', 'enum', 'multi_enum', 'number', 'date', 'people']

const collect = (value: string, previous: string[]) => [...previous, value]

function resolveCustomFieldApi(api?: CustomFieldApi | (() => CustomFieldApi)): CustomFieldApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listCustomFields,
			getCustomField,
			listCustomFieldSettingsForProject,
			listCustomFieldSettingsForPortfolio,
			listCustomFieldSettingsForGoal,
			listCustomFieldSettingsForTeam,
			createCustomField,
			createEnumOption,
			insertEnumOption,
			updateEnumOption,
			attachCustomField,
			detachCustomField,
		}
	)
}

// Minimal default schema for custom field lists — principle 2. `resource_subtype` is
// included because it tells the caller whether a value is text, number, or an enum GID.
const CUSTOM_FIELD_LIST_FIELDS = 'gid,name,resource_subtype'

// Minimal default schema for the attached-field lists — principle 2. The field identity,
// its type, and the enum option GIDs a `--custom-field` write has to name.
const CUSTOM_FIELD_SETTING_FIELDS =
	'custom_field.gid,custom_field.name,custom_field.resource_subtype,custom_field.enum_options.gid,custom_field.enum_options.name'

const SETTING_NEXT_STEPS = [
	'cyber-asana task update <gid> --custom-field <field-gid>=<value> — set one of these on a task',
	'cyber-asana custom-field get <field-gid> — view a field and every enum option',
]

type CustomFieldSetting = { gid?: string; custom_field?: (CustomField & { enum_options?: EnumOption[] }) | null }

type SettingListOptions = { limit?: number; offset?: string; optFields?: string; all?: boolean; maxPages?: number }

function addAttachedFieldsSubcommand(
	cmd: Command,
	name: string,
	description: string,
	list: (api: CustomFieldApi, gid: string, opts: ReturnType<typeof paginationOptionsFromCli>) => Promise<unknown>,
	api?: CustomFieldApi | (() => CustomFieldApi),
) {
	addPaginationOptions(cmd.command(`${name} <gid>`).description(description)).action(
		async (gid: string, opts: SettingListOptions) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= CUSTOM_FIELD_SETTING_FIELDS
			const data = (await list(resolveCustomFieldApi(api), gid, pagination)) as never
			output(data, () => {
				const items = itemsForOutput<CustomFieldSetting>(data)
				printTable(
					items,
					[
						{ label: 'Field', get: (s: CustomFieldSetting) => s.custom_field?.name ?? '' },
						{ label: 'ID', get: (s: CustomFieldSetting) => s.custom_field?.gid ?? '' },
						{ label: 'Type', get: (s: CustomFieldSetting) => s.custom_field?.resource_subtype ?? '' },
						{
							label: 'Options',
							get: (s: CustomFieldSetting) =>
								truncate((s.custom_field?.enum_options ?? []).map((o) => o.name).join(', '), { full: isFull() }),
						},
					],
					{ entity: 'custom fields' },
				)
				printCountSummary(items.length, 'custom field(s)')
				printNextPageHint(data)
				printNextSteps(SETTING_NEXT_STEPS)
			})
		},
	)
}

export function customFieldCommand(api?: CustomFieldApi | (() => CustomFieldApi)) {
	const cmd = new Command('custom-field').description('Discover Asana custom fields and their enum options')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana custom-field list --workspace-gid <gid>',
			'  cyber-asana custom-field get <gid> --toon',
			'  cyber-asana custom-field project <project-gid>',
			'  cyber-asana custom-field portfolio <portfolio-gid>',
			'  cyber-asana custom-field goal <goal-gid>',
			'  cyber-asana custom-field team <team-gid>',
			'',
			'`list` is every field in the workspace; `project` and friends are the fields',
			'actually attached to one resource — usually the narrower answer you want.',
			'',
			'The GIDs printed here are what `task create` / `task update` expect in',
			'--custom-field <gid=value> and --custom-fields-json.',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List custom fields in a workspace'), 'workspace', 'Workspace GID'),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= CUSTOM_FIELD_LIST_FIELDS
			const data = await resolveCustomFieldApi(api).listCustomFields(
				requiredGid(opts, 'workspace', 'Workspace GID'),
				pagination,
			)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (f: CustomField) => f.name ?? '' },
						{ label: 'Type', get: (f: CustomField) => f.resource_subtype ?? '' },
						{ label: 'ID', get: (f: CustomField) => f.gid },
					],
					{ entity: 'custom fields' },
				)
				printCountSummary(items.length, 'custom field(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana custom-field get <gid> — view a field and its enum options'])
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a custom field by GID, including its enum options')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = (await resolveCustomFieldApi(api).getCustomField(gid, readOptionsFromCli(opts))) as CustomField
			output(data, () => {
				printFields({
					Name: data.name,
					ID: data.gid,
					Type: data.resource_subtype,
					Description: truncate(data.description, { full: isFull() }),
				})
				printTable(
					data.enum_options ?? [],
					[
						{ label: 'Option', get: (o: EnumOption) => o.name ?? '' },
						{ label: 'ID', get: (o: EnumOption) => o.gid },
						{ label: 'Enabled', get: (o: EnumOption) => (o.enabled === false ? 'no' : 'yes') },
					],
					{ entity: 'enum options' },
				)
			})
		},
	)

	addAttachedFieldsSubcommand(
		cmd,
		'project',
		'List the custom fields attached to a project',
		(a, gid, opts) => a.listCustomFieldSettingsForProject(gid, opts),
		api,
	)
	addAttachedFieldsSubcommand(
		cmd,
		'portfolio',
		'List the custom fields attached to a portfolio',
		(a, gid, opts) => a.listCustomFieldSettingsForPortfolio(gid, opts),
		api,
	)
	addAttachedFieldsSubcommand(
		cmd,
		'goal',
		'List the custom fields attached to a goal',
		(a, gid, opts) => a.listCustomFieldSettingsForGoal(gid, opts),
		api,
	)
	addAttachedFieldsSubcommand(
		cmd,
		'team',
		'List the custom fields attached to a team',
		(a, gid, opts) => a.listCustomFieldSettingsForTeam(gid, opts),
		api,
	)

	addGidOption(
		cmd
			.command('create <name>')
			.description('Create a custom field in a workspace')
			.addOption(new Option('--type <type>', 'Field type').choices(FIELD_TYPES).default('text'))
			.option('--description <text>', 'Field description')
			.option('--option <name>', 'An enum option, repeatable; enum and multi_enum types only', collect, [] as string[])
			.option('--precision <digits>', 'Decimal places; number type only', (v) => Number(v)),
		'workspace',
		'Workspace GID',
	).action(
		async (
			name: string,
			opts: {
				workspace?: string
				workspaceGid?: string
				type: CreateCustomFieldInput['resourceSubtype']
				description?: string
				option: string[]
				precision?: number
			},
		) => {
			const isEnum = opts.type === 'enum' || opts.type === 'multi_enum'
			if (opts.option.length > 0 && !isEnum) {
				throw new Error(`--option applies to enum and multi_enum fields, not ${opts.type}`)
			}
			const field = (await resolveCustomFieldApi(api).createCustomField({
				workspace: requiredGid(opts, 'workspace', 'Workspace GID'),
				name,
				resourceSubtype: opts.type,
				...(opts.description !== undefined && { description: opts.description }),
				...(opts.precision !== undefined && { precision: opts.precision }),
				...(isEnum && opts.option.length > 0 && { enumOptions: opts.option.map((o) => ({ name: o })) }),
			})) as CustomField
			output(field, () => {
				console.log(`Created custom field ${field.name ?? name} (${field.gid})`)
				printNextSteps([
					'cyber-asana custom-field attach <project-gid> <field-gid> — attach it to a project',
					'cyber-asana custom-field enum-option add <field-gid> <name> — add an enum option',
				])
			})
		},
	)

	const enumOption = cmd.command('enum-option').description("Manage a custom field's enum options")

	enumOption
		.command('add <field-gid> <name>')
		.description('Add an enum option to a custom field (at the end unless placed)')
		.option('--color <color>', 'Option color, such as blue or red')
		.option('--insert-before <option-gid>', 'Place before this option')
		.option('--insert-after <option-gid>', 'Place after this option')
		.action(
			async (fieldGid: string, name: string, opts: { color?: string; insertBefore?: string; insertAfter?: string }) => {
				if (opts.insertBefore && opts.insertAfter) {
					throw new Error('--insert-before and --insert-after are mutually exclusive')
				}
				const created = (await resolveCustomFieldApi(api).createEnumOption(fieldGid, {
					name,
					...(opts.color !== undefined && { color: opts.color }),
					...(opts.insertBefore !== undefined && { insertBefore: opts.insertBefore }),
					...(opts.insertAfter !== undefined && { insertAfter: opts.insertAfter }),
				})) as EnumOption
				output(created, () => console.log(`Added enum option ${created.name ?? name} (${created.gid}) to ${fieldGid}`))
			},
		)

	enumOption
		.command('move <field-gid> <option-gid>')
		.description('Reorder an enum option before or after another')
		.option('--before <option-gid>', 'Place before this option')
		.option('--after <option-gid>', 'Place after this option')
		.action(async (fieldGid: string, optionGid: string, opts: { before?: string; after?: string }) => {
			if (Boolean(opts.before) === Boolean(opts.after)) {
				throw new Error('Give exactly one of --before and --after')
			}
			await resolveCustomFieldApi(api).insertEnumOption(fieldGid, {
				enumOption: optionGid,
				...(opts.before !== undefined && { beforeEnumOption: opts.before }),
				...(opts.after !== undefined && { afterEnumOption: opts.after }),
			})
			output({ custom_field: fieldGid, enum_option: optionGid, status: 'moved' }, () =>
				console.log(`Moved enum option ${optionGid} in ${fieldGid}`),
			)
		})

	enumOption
		.command('update <option-gid>')
		.description('Rename, recolor, disable, or re-enable an enum option')
		.option('--name <name>', 'New name')
		.option('--color <color>', 'New color')
		.option('--disabled', 'Disable the option')
		.option('--enabled', 'Enable the option')
		.action(
			async (optionGid: string, opts: { name?: string; color?: string; disabled?: boolean; enabled?: boolean }) => {
				if (opts.disabled && opts.enabled) throw new Error('--disabled and --enabled are mutually exclusive')
				const changes = {
					...(opts.name !== undefined && { name: opts.name }),
					...(opts.color !== undefined && { color: opts.color }),
					...(opts.disabled && { enabled: false }),
					...(opts.enabled && { enabled: true }),
				}
				if (Object.keys(changes).length === 0)
					throw new Error('Nothing to update: give --name, --color, --disabled, or --enabled')
				const updated = (await resolveCustomFieldApi(api).updateEnumOption(optionGid, changes)) as EnumOption
				output(updated, () => console.log(`Updated enum option ${updated.name ?? optionGid} (${optionGid})`))
			},
		)

	cmd
		.command('attach <project-gid> <field-gid>')
		.description('Attach a custom field to a project (no-op when it already is)')
		.option('--important', 'Show the field on the project list by default')
		.action(async (projectGid: string, fieldGid: string, opts: { important?: boolean }) => {
			const result = await resolveCustomFieldApi(api).attachCustomField(projectGid, fieldGid, {
				...(opts.important && { isImportant: true }),
			})
			output(result, () =>
				console.log(
					result.status === 'attached'
						? `Attached custom field ${fieldGid} to project ${projectGid}`
						: `Custom field ${fieldGid} was already attached to project ${projectGid}`,
				),
			)
		})

	cmd
		.command('detach <project-gid> <field-gid>')
		.description('Detach a custom field from a project (no-op when it is not attached)')
		.action(async (projectGid: string, fieldGid: string) => {
			const result = await resolveCustomFieldApi(api).detachCustomField(projectGid, fieldGid)
			output(result, () =>
				console.log(
					result.status === 'detached'
						? `Detached custom field ${fieldGid} from project ${projectGid}`
						: `Custom field ${fieldGid} was already detached from project ${projectGid}`,
				),
			)
		})

	return cmd
}

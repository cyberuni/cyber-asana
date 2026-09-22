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
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import { isFull, truncate } from '../truncate.js'
import type { CustomFieldApi } from './api.js'
import {
	getCustomField,
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
	listCustomFields,
} from './api.js'

type EnumOption = { gid: string; name: string; enabled?: boolean }
type CustomField = {
	gid: string
	name: string
	resource_subtype?: string
	description?: string
	enum_options?: EnumOption[]
}

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
		addGidOption(cmd.command('list').description('List custom fields in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
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
						{ label: 'Name', get: (f: CustomField) => f.name },
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
						{ label: 'Option', get: (o: EnumOption) => o.name },
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

	return cmd
}

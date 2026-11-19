import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { CustomFieldApi } from './api.js'
import {
	attachCustomField,
	attachCustomFieldToPortfolio,
	createCustomField,
	createEnumOption,
	deleteCustomField,
	detachCustomField,
	detachCustomFieldFromPortfolio,
	getCustomField,
	insertEnumOption,
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
	listCustomFields,
	updateCustomField,
	updateEnumOption,
} from './default.js'

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
			updateCustomField,
			deleteCustomField,
			attachCustomField,
			attachCustomFieldToPortfolio,
			detachCustomField,
			detachCustomFieldFromPortfolio,
		}
	)
}

export function registerCustomFieldTools(server: McpServer, api?: CustomFieldApi | (() => CustomFieldApi)) {
	server.tool(
		'asana_custom_field_list',
		"List a workspace's custom fields — use this to find the field GIDs that asana_task_create and asana_task_update expect in custom_fields",
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFields(workspace_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_get',
		'Get an Asana custom field by GID, including its enum options and their GIDs',
		{ custom_field_gid: z.string().describe('Custom field GID'), ...readParams },
		async ({ custom_field_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveCustomFieldApi(api).getCustomField(custom_field_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_project',
		'List the Asana custom fields attached to a project, with their enum options — the fields actually usable on tasks in that project, and narrower than asana_custom_field_list',
		{ project_gid: z.string().describe('Project GID'), ...paginationParams },
		async ({ project_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForProject(project_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_portfolio',
		'List the Asana custom fields attached to a portfolio, with their enum options',
		{ portfolio_gid: z.string().describe('Portfolio GID'), ...paginationParams },
		async ({ portfolio_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForPortfolio(
							portfolio_gid,
							paginationOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_goal',
		'List the Asana custom fields attached to a goal, with their enum options',
		{ goal_gid: z.string().describe('Goal GID'), ...paginationParams },
		async ({ goal_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForGoal(goal_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_team',
		'List the Asana custom fields attached to a team, with their enum options',
		{ team_gid: z.string().describe('Team GID'), ...paginationParams },
		async ({ team_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForTeam(team_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

	server.tool(
		'asana_custom_field_create',
		'Create a custom field in a workspace. For enum and multi_enum types, enum_options seeds the options. Attach it to projects afterwards with asana_custom_field_attach',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Field name, unique within the workspace'),
			type: z.enum(['text', 'enum', 'multi_enum', 'number', 'date', 'people']).describe('Field type'),
			description: z.string().optional().describe('Field description'),
			precision: z.number().int().optional().describe('Decimal places; number type only'),
			enum_options: z.array(z.string()).optional().describe('Option names; enum and multi_enum types only'),
			...readParams,
		},
		async ({ workspace_gid, name, type, description, precision, enum_options, ...params }) =>
			json(
				await resolveCustomFieldApi(api).createCustomField(
					{
						workspace: workspace_gid,
						name,
						resourceSubtype: type,
						...(description !== undefined && { description }),
						...(precision !== undefined && { precision }),
						...(enum_options !== undefined && { enumOptions: enum_options.map((o) => ({ name: o })) }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_custom_field_update',
		"Edit a custom field: name, description, number precision or format, currency code, label, or enabled state. The field's type (resource_subtype) cannot be changed. Give at least one property",
		{
			custom_field_gid: z.string().describe('Custom field GID'),
			name: z.string().optional().describe('New name'),
			description: z.string().optional().describe('New description'),
			precision: z.number().int().optional().describe('Decimal places; number type only'),
			format: z
				.enum(['currency', 'identifier', 'percentage', 'custom', 'duration', 'none'])
				.optional()
				.describe('Number format; number type only'),
			currency_code: z.string().optional().describe('ISO 4217 code, such as USD; currency format only'),
			custom_label: z.string().optional().describe('Label shown with the value; custom format only'),
			custom_label_position: z.enum(['prefix', 'suffix']).optional().describe('Where the label goes'),
			enabled: z.boolean().optional().describe('false disables the field, true re-enables it'),
			...readParams,
		},
		async ({
			custom_field_gid,
			name,
			description,
			precision,
			format,
			currency_code,
			custom_label,
			custom_label_position,
			enabled,
			...params
		}) => {
			const changes = {
				...(name !== undefined && { name }),
				...(description !== undefined && { description }),
				...(precision !== undefined && { precision }),
				...(format !== undefined && { format }),
				...(currency_code !== undefined && { currencyCode: currency_code }),
				...(custom_label !== undefined && { customLabel: custom_label }),
				...(custom_label_position !== undefined && { customLabelPosition: custom_label_position }),
				...(enabled !== undefined && { enabled }),
			}
			if (Object.keys(changes).length === 0) throw new Error('Nothing to update: give at least one property to change')
			return json(await resolveCustomFieldApi(api).updateCustomField(custom_field_gid, changes, readOptions(params)))
		},
	)

	server.tool(
		'asana_custom_field_delete',
		'Delete a custom field from its workspace, removing it from every project and task that uses it. Idempotent: already_absent is true when the field was already gone',
		{ custom_field_gid: z.string().describe('Custom field GID') },
		async ({ custom_field_gid }) =>
			json(
				await deleteIdempotently('custom_field', custom_field_gid, () =>
					resolveCustomFieldApi(api).deleteCustomField(custom_field_gid),
				),
			),
	)

	server.tool(
		'asana_custom_field_enum_option_create',
		'Add an enum option to a custom field, at the end unless insert_before or insert_after names an existing option',
		{
			custom_field_gid: z.string().describe('Custom field GID'),
			name: z.string().describe('Option name'),
			color: z.string().optional().describe('Option color, such as blue'),
			insert_before: z.string().optional().describe('Enum option GID to place this one before'),
			insert_after: z.string().optional().describe('Enum option GID to place this one after'),
			...readParams,
		},
		async ({ custom_field_gid, name, color, insert_before, insert_after, ...params }) =>
			json(
				await resolveCustomFieldApi(api).createEnumOption(
					custom_field_gid,
					{
						name,
						...(color !== undefined && { color }),
						...(insert_before !== undefined && { insertBefore: insert_before }),
						...(insert_after !== undefined && { insertAfter: insert_after }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_custom_field_enum_option_insert',
		"Reorder a custom field's enum: move one option before or after another (give exactly one of before_enum_option_gid and after_enum_option_gid)",
		{
			custom_field_gid: z.string().describe('Custom field GID'),
			enum_option_gid: z.string().describe('The enum option to move'),
			before_enum_option_gid: z.string().optional().describe('Place before this option'),
			after_enum_option_gid: z.string().optional().describe('Place after this option'),
		},
		async ({ custom_field_gid, enum_option_gid, before_enum_option_gid, after_enum_option_gid }) =>
			json(
				await resolveCustomFieldApi(api).insertEnumOption(custom_field_gid, {
					enumOption: enum_option_gid,
					...(before_enum_option_gid !== undefined && { beforeEnumOption: before_enum_option_gid }),
					...(after_enum_option_gid !== undefined && { afterEnumOption: after_enum_option_gid }),
				}),
			),
	)

	server.tool(
		'asana_custom_field_enum_option_update',
		'Rename, recolor, disable, or re-enable an enum option',
		{
			enum_option_gid: z.string().describe('Enum option GID'),
			name: z.string().optional().describe('New name'),
			color: z.string().optional().describe('New color'),
			enabled: z.boolean().optional().describe('false disables the option, true re-enables it'),
			...readParams,
		},
		async ({ enum_option_gid, name, color, enabled, ...params }) =>
			json(
				await resolveCustomFieldApi(api).updateEnumOption(
					enum_option_gid,
					{
						...(name !== undefined && { name }),
						...(color !== undefined && { color }),
						...(enabled !== undefined && { enabled }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_custom_field_attach',
		'Attach a custom field to a project so its tasks can carry it. Idempotent: status is attached, or already_attached with nothing written',
		{
			project_gid: z.string().describe('Project GID'),
			custom_field_gid: z.string().describe('Custom field GID'),
			is_important: z.boolean().optional().describe('Show the field on the project list by default'),
			insert_before: z
				.string()
				.optional()
				.describe('Custom field setting GID on this project to place the field before; not with insert_after'),
			insert_after: z
				.string()
				.optional()
				.describe('Custom field setting GID on this project to place the field after; not with insert_before'),
		},
		async ({ project_gid, custom_field_gid, is_important, insert_before, insert_after }) =>
			json(
				await resolveCustomFieldApi(api).attachCustomField(project_gid, custom_field_gid, {
					...(is_important !== undefined && { isImportant: is_important }),
					...(insert_before !== undefined && { insertBefore: insert_before }),
					...(insert_after !== undefined && { insertAfter: insert_after }),
				}),
			),
	)

	server.tool(
		'asana_custom_field_detach',
		'Detach a custom field from a project. Idempotent: status is detached, or already_detached with nothing written',
		{
			project_gid: z.string().describe('Project GID'),
			custom_field_gid: z.string().describe('Custom field GID'),
		},
		async ({ project_gid, custom_field_gid }) =>
			json(await resolveCustomFieldApi(api).detachCustomField(project_gid, custom_field_gid)),
	)

	server.tool(
		'asana_custom_field_attach_portfolio',
		'Attach a custom field to a portfolio (paid plan). Idempotent: status is attached, or already_attached with nothing written',
		{
			portfolio_gid: z.string().describe('Portfolio GID'),
			custom_field_gid: z.string().describe('Custom field GID'),
			is_important: z.boolean().optional().describe('Show the field on the portfolio list by default'),
			insert_before: z
				.string()
				.optional()
				.describe('Custom field setting GID on this portfolio to place the field before; not with insert_after'),
			insert_after: z
				.string()
				.optional()
				.describe('Custom field setting GID on this portfolio to place the field after; not with insert_before'),
		},
		async ({ portfolio_gid, custom_field_gid, is_important, insert_before, insert_after }) =>
			json(
				await resolveCustomFieldApi(api).attachCustomFieldToPortfolio(portfolio_gid, custom_field_gid, {
					...(is_important !== undefined && { isImportant: is_important }),
					...(insert_before !== undefined && { insertBefore: insert_before }),
					...(insert_after !== undefined && { insertAfter: insert_after }),
				}),
			),
	)

	server.tool(
		'asana_custom_field_detach_portfolio',
		'Detach a custom field from a portfolio (paid plan). Idempotent: status is detached, or already_detached with nothing written',
		{
			portfolio_gid: z.string().describe('Portfolio GID'),
			custom_field_gid: z.string().describe('Custom field GID'),
		},
		async ({ portfolio_gid, custom_field_gid }) =>
			json(await resolveCustomFieldApi(api).detachCustomFieldFromPortfolio(portfolio_gid, custom_field_gid)),
	)
}

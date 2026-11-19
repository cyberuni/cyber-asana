import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import {
	customTypeParam,
	paginationOptions,
	paginationParams,
	readOptions,
	readParams,
} from '../platform/mcp/options.js'
import type { PortfolioApi } from './api.js'
import {
	addPortfolioItem,
	createPortfolio,
	deletePortfolio,
	getPortfolio,
	listPortfolioItems,
	listPortfolios,
	removePortfolioItem,
	updatePortfolio,
} from './default.js'
import { PORTFOLIO_COLORS, PORTFOLIO_DEFAULT_ACCESS_LEVELS, PORTFOLIO_RESOURCE_SUBTYPES } from './portfolio-enums.js'
import { buildPortfolioCreateFields, buildPortfolioUpdateFields } from './write-options.js'

function resolvePortfolioApi(api?: PortfolioApi | (() => PortfolioApi)): PortfolioApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listPortfolios,
			listPortfolioItems,
			getPortfolio,
			createPortfolio,
			updatePortfolio,
			deletePortfolio,
			addPortfolioItem,
			removePortfolioItem,
		}
	)
}

const portfolioWriteParams = {
	archived: z.boolean().optional().describe('Archive (true) or unarchive (false) the portfolio'),
	color: z.enum(PORTFOLIO_COLORS).optional().describe('Portfolio color'),
	custom_type: z.string().optional().describe('Custom type GID; Asana accepts it only when resource_subtype is custom'),
	resource_subtype: z.enum(PORTFOLIO_RESOURCE_SUBTYPES).optional().describe('Portfolio resource subtype'),
	default_access_level: z.enum(PORTFOLIO_DEFAULT_ACCESS_LEVELS).optional().describe('Default access level for members'),
	public: z.boolean().optional().describe('Public to the workspace when true; new portfolios are private'),
	due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
	start_on: z
		.string()
		.optional()
		.describe('Start date (YYYY-MM-DD); Asana requires due_on in the same request, and not before it'),
}

type PortfolioWriteParams = {
	archived?: boolean
	color?: string
	custom_type?: string
	resource_subtype?: string
	default_access_level?: string
	public?: boolean
	due_on?: string
	start_on?: string
}

function portfolioWriteInput(params: PortfolioWriteParams) {
	return {
		archived: params.archived,
		color: params.color,
		customType: params.custom_type,
		resourceSubtype: params.resource_subtype,
		defaultAccessLevel: params.default_access_level,
		public: params.public,
		dueOn: params.due_on,
		startOn: params.start_on,
	}
}

export function registerPortfolioTools(server: McpServer, api?: PortfolioApi | (() => PortfolioApi)) {
	server.tool(
		'asana_portfolio_list',
		'List Asana portfolios in a workspace',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			owner_gid: z
				.string()
				.optional()
				.describe('Only list portfolios owned by this user GID; honored for service accounts only'),
			custom_type: customTypeParam('portfolios'),
			...paginationParams,
		},
		async ({ workspace_gid, owner_gid, custom_type, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolvePortfolioApi(api).listPortfolios(workspace_gid, {
							...paginationOptions(params),
							...(owner_gid ? { owner: owner_gid } : {}),
							...(custom_type !== undefined && { customType: custom_type }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_item_list',
		'List the items (projects) in an Asana portfolio',
		{ portfolio_gid: z.string().describe('Portfolio GID'), ...paginationParams },
		async ({ portfolio_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolvePortfolioApi(api).listPortfolioItems(portfolio_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_get',
		'Get an Asana portfolio by GID',
		{ portfolio_gid: z.string().describe('Portfolio GID'), ...readParams },
		async ({ portfolio_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolvePortfolioApi(api).getPortfolio(portfolio_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_create',
		'Create an Asana portfolio',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Portfolio name'),
			...portfolioWriteParams,
			...readParams,
		},
		async ({ workspace_gid, name, opt_fields, ...fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolvePortfolioApi(api).createPortfolio(
							workspace_gid,
							name,
							readOptions({ opt_fields }),
							buildPortfolioCreateFields(portfolioWriteInput(fields)),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_update',
		'Update an Asana portfolio',
		{
			portfolio_gid: z.string().describe('Portfolio GID'),
			name: z.string().optional().describe('New name'),
			...portfolioWriteParams,
			custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by field GID'),
			html_custom_fields: z
				.record(z.string(), z.string())
				.optional()
				.describe('Text custom field values as HTML, keyed by field GID: "<body>...</body>"'),
			...readParams,
		},
		async ({ portfolio_gid, name, custom_fields, html_custom_fields, opt_fields, ...fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolvePortfolioApi(api).updatePortfolio(
							portfolio_gid,
							buildPortfolioUpdateFields({
								...portfolioWriteInput(fields),
								name,
								customFields: custom_fields,
								htmlCustomFields: html_custom_fields,
							}),
							readOptions({ opt_fields }),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_delete',
		'Delete an Asana portfolio',
		{ portfolio_gid: z.string().describe('Portfolio GID') },
		async ({ portfolio_gid }) => {
			const result = await deleteIdempotently('portfolio', portfolio_gid, () =>
				resolvePortfolioApi(api).deletePortfolio(portfolio_gid),
			)
			return { content: [{ type: 'text', text: JSON.stringify(result) }] }
		},
	)

	server.tool(
		'asana_portfolio_item_add',
		'Add a project or portfolio to an Asana portfolio. Adding an item already there changes nothing (status already_added).',
		{
			portfolio_gid: z.string().describe('Portfolio GID'),
			item_gid: z.string().describe('GID of the project or portfolio to add'),
			insert_before: z.string().optional().describe('Place the item before this existing item GID'),
			insert_after: z.string().optional().describe('Place the item after this existing item GID'),
		},
		async ({ portfolio_gid, item_gid, insert_before, insert_after }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolvePortfolioApi(api).addPortfolioItem(portfolio_gid, item_gid, {
							...(insert_before !== undefined && { insertBefore: insert_before }),
							...(insert_after !== undefined && { insertAfter: insert_after }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_item_remove',
		'Remove an item from an Asana portfolio. Removing one that is not there changes nothing (status already_removed).',
		{
			portfolio_gid: z.string().describe('Portfolio GID'),
			item_gid: z.string().describe('GID of the project or portfolio to remove'),
		},
		async ({ portfolio_gid, item_gid }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolvePortfolioApi(api).removePortfolioItem(portfolio_gid, item_gid)),
				},
			],
		}),
	)
}

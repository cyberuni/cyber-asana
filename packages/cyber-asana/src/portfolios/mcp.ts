import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { PortfolioApi } from './api.js'
import {
	createPortfolio,
	deletePortfolio,
	getPortfolio,
	listPortfolioItems,
	listPortfolios,
	updatePortfolio,
} from './api.js'

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
		}
	)
}

export function registerPortfolioTools(server: McpServer, api?: PortfolioApi | (() => PortfolioApi)) {
	server.tool(
		'asana_portfolio_list',
		'List Asana portfolios in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolvePortfolioApi(api).listPortfolios(workspace_gid, paginationOptions(params))),
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
		{ portfolio_gid: z.string().describe('Portfolio GID') },
		async ({ portfolio_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolvePortfolioApi(api).getPortfolio(portfolio_gid)) }],
		}),
	)

	server.tool(
		'asana_portfolio_create',
		'Create an Asana portfolio',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Portfolio name'),
		},
		async ({ workspace_gid, name }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolvePortfolioApi(api).createPortfolio(workspace_gid, name)),
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
		},
		async ({ portfolio_gid, name }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolvePortfolioApi(api).updatePortfolio(portfolio_gid, { name })),
				},
			],
		}),
	)

	server.tool(
		'asana_portfolio_delete',
		'Delete an Asana portfolio',
		{ portfolio_gid: z.string().describe('Portfolio GID') },
		async ({ portfolio_gid }) => {
			await resolvePortfolioApi(api).deletePortfolio(portfolio_gid)
			return { content: [{ type: 'text', text: `Deleted portfolio ${portfolio_gid}` }] }
		},
	)
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createPortfolio, deletePortfolio, getPortfolio, listPortfolios, updatePortfolio } from './api.js'

export function registerPortfolioTools(server: McpServer) {
	server.tool(
		'asana_portfolio_list',
		'List Asana portfolios in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listPortfolios(workspace_gid)) }],
		}),
	)

	server.tool(
		'asana_portfolio_get',
		'Get an Asana portfolio by GID',
		{ portfolio_gid: z.string().describe('Portfolio GID') },
		async ({ portfolio_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getPortfolio(portfolio_gid)) }],
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
			content: [{ type: 'text', text: JSON.stringify(await createPortfolio(workspace_gid, name)) }],
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
			content: [{ type: 'text', text: JSON.stringify(await updatePortfolio(portfolio_gid, { name })) }],
		}),
	)

	server.tool(
		'asana_portfolio_delete',
		'Delete an Asana portfolio',
		{ portfolio_gid: z.string().describe('Portfolio GID') },
		async ({ portfolio_gid }) => {
			await deletePortfolio(portfolio_gid)
			return { content: [{ type: 'text', text: `Deleted portfolio ${portfolio_gid}` }] }
		},
	)
}

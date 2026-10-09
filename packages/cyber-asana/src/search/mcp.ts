import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { SearchApi } from './api.js'
import { TYPEAHEAD_RESOURCE_TYPES } from './api.js'
import { searchObjects } from './default.js'

function resolveSearchApi(api?: SearchApi | (() => SearchApi)): SearchApi {
	if (typeof api === 'function') return api()
	return api ?? { searchObjects }
}

// Minimal default schema for typeahead hits — `resource_type` earns its place because
// `actor` returns a mix of users and agents.
const SEARCH_HIT_FIELDS = 'gid,name,resource_type'

const SEARCH_OBJECTS_DESCRIPTION = [
	'Find Asana objects by name in a workspace via typeahead — the way to turn a name into a GID for the other tools.',
	'Takes one resource type per call; searching several types at once is not supported by Asana.',
	'Returns a single capped page ordered by relevance/recency (count defaults to 20, max 100).',
	'There is no pagination, and results are not exhaustive — Asana advises not relying on this for accurate search results.',
	'For exhaustive, filterable task or project search use asana_task_search / asana_project_search instead.',
].join(' ')

export function registerSearchTools(server: McpServer, api?: SearchApi | (() => SearchApi)) {
	server.tool(
		'asana_search_objects',
		SEARCH_OBJECTS_DESCRIPTION,
		{
			workspace_gid: z.string().describe('Workspace GID'),
			resource_type: z
				.enum(TYPEAHEAD_RESOURCE_TYPES)
				.describe('Object type to search — exactly one per call. `actor` returns users and agents together'),
			query: z.string().optional().describe('Text to match; omit to get the top results for the ordering'),
			count: z.number().int().min(1).max(100).optional().describe('Results to return, from 1 to 100 (default: 20)'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({ workspace_gid, resource_type, query, count, opt_fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveSearchApi(api).searchObjects(workspace_gid, resource_type, {
							query,
							count,
							optFields: opt_fields ?? SEARCH_HIT_FIELDS,
						}),
					),
				},
			],
		}),
	)
}

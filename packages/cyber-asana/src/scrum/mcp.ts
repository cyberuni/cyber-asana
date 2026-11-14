import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SCOPE_KINDS, type ScopeEntry } from '../config/scopes.js'
import type { ScrumApi } from './api.js'
import { createDefaultScrumApi } from './default.js'

function resolveApi(api?: ScrumApi | (() => ScrumApi)): ScrumApi {
	if (typeof api === 'function') return api()
	return api ?? createDefaultScrumApi()
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

export function registerScrumTools(server: McpServer, api?: ScrumApi | (() => ScrumApi)) {
	server.tool(
		'asana_scope_list',
		'List the scrum scopes configured for this repo (its .agents/cyber-asana.json and the global registry), with where each came from and which is the default. With no scope configured, `implicit` names the repo default project that stands in for one.',
		{},
		async () => json(await resolveApi(api).listScopes()),
	)

	server.tool(
		'asana_scope_add',
		'Add a scrum scope, or replace the one with the same name. Saves to the repo config (which becomes schema_version 3), or to the global registry with global=true. A scope may override only sprint_model, sprint_length_days, and sprint_anchor_date.',
		{
			name: z.string().describe('Scope name'),
			kind: z.enum(SCOPE_KINDS).describe('project (exactly one project), projects (several), or portfolio'),
			project_gids: z.array(z.string()).optional().describe('Project GIDs, for kind project or projects'),
			portfolio_gid: z.string().optional().describe('Portfolio GID, for kind portfolio'),
			default: z.boolean().optional().describe('Use this scope when none is named'),
			sprint_model: z.string().optional().describe('Override the policy sprint_model'),
			sprint_length_days: z.number().int().positive().optional().describe('Override the policy sprint_length_days'),
			sprint_anchor_date: z.string().optional().describe('Override the policy sprint_anchor_date, YYYY-MM-DD'),
			global: z.boolean().optional().describe('Save to the global registry for this repo instead of the repo config'),
		},
		async (params) => {
			const scope: ScopeEntry = {
				name: params.name,
				kind: params.kind,
				...(params.project_gids !== undefined && { projects: params.project_gids }),
				...(params.portfolio_gid !== undefined && { portfolio: params.portfolio_gid }),
				...(params.default && { default: true as const }),
				...(params.sprint_model !== undefined && { sprint_model: params.sprint_model }),
				...(params.sprint_length_days !== undefined && { sprint_length_days: params.sprint_length_days }),
				...(params.sprint_anchor_date !== undefined && { sprint_anchor_date: params.sprint_anchor_date }),
			}
			return json(await resolveApi(api).addScope(scope, { global: params.global }))
		},
	)

	server.tool(
		'asana_scope_remove',
		'Remove a scrum scope by name, from the repo config or else the global registry',
		{
			name: z.string().describe('Scope name'),
			global: z.boolean().optional().describe('Remove from the global registry only'),
		},
		async ({ name, global }) => json(await resolveApi(api).removeScope(name, { global })),
	)

	server.tool(
		'asana_scope_resolve',
		'Resolve a scrum scope to the projects it covers (following nested portfolios) and its effective sprint settings. Without scope, uses the scope marked default, else the repo default project. Fails with code scope-unknown for a name that is not configured, and scope-missing when nothing selects a scope.',
		{
			scope: z.string().optional().describe('Scope name'),
			tasks: z.boolean().optional().describe("Also list the scope's tasks, each counted once"),
		},
		async ({ scope, tasks }) =>
			json(
				await resolveApi(api).resolveScope({ ...(scope !== undefined && { scope }), ...(tasks && { tasks: true }) }),
			),
	)
}

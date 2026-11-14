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

	const sprintParams = {
		scope: z.string().optional().describe('Scope name (default: the scope marked default)'),
		sprint: z
			.string()
			.optional()
			.describe('current (default), next, previous, a sprint number, or a name written by sprint_name_format'),
	}
	const errors =
		' Fails with code sprint-none (no sprint started; start one with asana_sprint_start), sprint-unknown, model-unsupported (a sprint model the CLI does not build in), or policy-incomplete (no sprint_anchor_date).'
	const pick = <T extends { scope?: string; sprint?: string }>({ scope, sprint }: T) => ({
		...(scope !== undefined && { scope }),
		...(sprint !== undefined && { sprint }),
	})

	server.tool(
		'asana_sprint_current',
		"Today's sprint, computed from the scrum policy (anchor date, length, name format) in the user's Asana timezone: index, name, dates, working days, and the projects that hold its section." +
			errors,
		{ scope: sprintParams.scope },
		async ({ scope }) => json(await resolveApi(api).currentSprint({ ...(scope !== undefined && { scope }) })),
	)

	server.tool(
		'asana_sprint_list',
		'List the sprints that have a section in the scope, plus the current one, each with its state (past, current, future).' +
			errors,
		{ scope: sprintParams.scope },
		async ({ scope }) => json(await resolveApi(api).listSprints({ ...(scope !== undefined && { scope }) })),
	)

	server.tool(
		'asana_sprint_tasks',
		"List a sprint's tasks, each counted once across the scope's projects, with total, completed, and open counts." +
			errors,
		{
			...sprintParams,
			incomplete: z.boolean().optional().describe('Only tasks that are not completed'),
			opt_fields: z.string().optional().describe('Comma-separated Asana fields'),
		},
		async ({ incomplete, opt_fields, ...rest }) =>
			json(
				await resolveApi(api).sprintTasks({
					...pick(rest),
					...(incomplete && { incomplete: true }),
					...(opt_fields !== undefined && { optFields: opt_fields }),
				}),
			),
	)

	server.tool(
		'asana_sprint_add',
		"Put tasks in a sprint: moves each into the sprint's section of its project in the scope. A task already there is reported in already_in_sprint and not touched." +
			errors,
		{ ...sprintParams, task_gids: z.array(z.string()).min(1).describe('Task GIDs') },
		async ({ task_gids, ...rest }) => json(await resolveApi(api).addToSprint({ ...pick(rest), tasks: task_gids })),
	)

	server.tool(
		'asana_sprint_start',
		"Create the sprint's section in each project of the scope that lacks one. Idempotent: when every section exists nothing changes and already_started is true." +
			errors,
		sprintParams,
		async (params) => json(await resolveApi(api).startSprint(pick(params))),
	)

	server.tool(
		'asana_sprint_close',
		"Close a sprint and carry its incomplete tasks over as the policy's carry_over says: move puts them in the next sprint's section (created when missing), leave keeps them. Moves nothing when no task is incomplete." +
			errors,
		sprintParams,
		async (params) => json(await resolveApi(api).closeSprint(pick(params))),
	)

	server.tool(
		'asana_backlog_list',
		"List the backlog: incomplete tasks in sections that are not sprint sections, in each project's order, each once. backlog_section_missing names projects without the policy's backlog section." +
			errors.replace('sprint-none (no sprint started; start one with asana_sprint_start), sprint-unknown, ', ''),
		{
			scope: sprintParams.scope,
			opt_fields: z.string().optional().describe('Comma-separated Asana fields'),
		},
		async ({ scope, opt_fields }) =>
			json(
				await resolveApi(api).listBacklog({
					...(scope !== undefined && { scope }),
					...(opt_fields !== undefined && { optFields: opt_fields }),
				}),
			),
	)

	server.tool(
		'asana_report_standup',
		"A member's standup (R1), computed: Done (completed within the policy's standup_window), Today (incomplete, in the current sprint, in progress or due today; falls back to every incomplete assigned task when no state is carried, and says so in notes), and Blocked (from blocked_signals, each with its blocker). Story and task points are totalled apart. With no current sprint it carries on without sprint filters and sprint_note says why. Fails with code sprint-none for an explicitly named sprint that has not started, sprint-unknown, model-unsupported, or team-unsupported (team standup is not built yet).",
		{
			...sprintParams,
			member: z.string().optional().describe('Another member by GID or email; the signed-in user when omitted'),
			team: z.boolean().optional().describe('The whole team; not built yet'),
		},
		async ({ member, team, ...rest }) =>
			json(
				await resolveApi(api).reportStandup({
					...pick(rest),
					...(member !== undefined && { member }),
					...(team && { team: true }),
				}),
			),
	)

	server.tool(
		'asana_report_health',
		"The health check report (R5): one result per check enabled in the cyber-asana.report.health reference, over the sprint's tasks. H1 no estimate, H2 a parent carrying points, H3 unassigned, H4 overdue, H5 in progress with no change for stale_days, H6 a person over wip_limit, H7 blocked, H8 a person over their Allocations capacity for the sprint's dates (skipped, with the reason, when capacity is unknown), H9 the sprint has no section, H10 a closed sprint holding incomplete tasks, H11 a task in two sprints. Each finding has a level (error or warning), the task, and a fix command. With state_carrier none, in progress means incomplete and assigned, and notes says so. When the sprint has no section, H9 reports it (the task checks are skipped); with H9 disabled that is sprint-none. Fails with code sprint-none (today is before the anchor date, or H9 disabled), sprint-unknown, model-unsupported, or policy-incomplete.",
		sprintParams,
		async (params) => json(await resolveApi(api).reportHealth(pick(params))),
	)

	server.tool(
		'asana_report_workload',
		"The workload report (R6): per person, the story points, task points, and effort hours (both kinds × hours_per_point, parts shown) of their incomplete assigned tasks, against capacity hours from Asana Allocations clipped to the window (hours as given; percent × working_hours_per_day × working days), with utilization % and over/under flags (thresholds in cyber-asana.report.workload), and a team total. The window is the sprint's dates by default, or from/to, which count the scope's incomplete assigned tasks due inside it. Capacity that is unknown (402 plan limit, or no allocation) is named per person with its reason and the load still shows. Out-of-office entries appear as a note beside capacity and are never subtracted. Fails with code sprint-none (the sprint has no section), sprint-unknown, model-unsupported, policy-incomplete, or window-invalid.",
		{
			...sprintParams,
			from: z.string().optional().describe('First day of the window, YYYY-MM-DD; with to, replaces the sprint'),
			to: z.string().optional().describe('Last day of the window, YYYY-MM-DD'),
			workspace_gid: z.string().optional().describe('Workspace GID for out-of-office (default: ASANA_WORKSPACE_GID)'),
		},
		async ({ from, to, workspace_gid, ...rest }) =>
			json(
				await resolveApi(api).reportWorkload({
					...pick(rest),
					...(from !== undefined && { from }),
					...(to !== undefined && { to }),
					...(workspace_gid !== undefined && { workspace: workspace_gid }),
				}),
			),
	)
}

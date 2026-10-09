import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../platform/mcp/options.js'
import type { AiStudioApi } from './api.js'
import { listAiStudioRuns, listAiStudioSeats } from './default.js'
import { AI_STUDIO_SEAT_FILTER_STATES } from './gateway.js'

function resolveAiStudioApi(api?: AiStudioApi | (() => AiStudioApi)): AiStudioApi {
	if (typeof api === 'function') return api()
	return api ?? { listAiStudioRuns, listAiStudioSeats }
}

// The usage endpoints return a fixed row shape, so opt_fields is not offered.
const { opt_fields: _optFields, ...pageParams } = paginationParams

const divisionGidParam = z
	.string()
	.optional()
	.describe("Scope to one division (default: the org's first licensed division)")

export function registerAiStudioTools(server: McpServer, api?: AiStudioApi | (() => AiStudioApi)) {
	server.tool(
		'asana_ai_studio_run_list',
		'List Asana AI Studio runs (rule executions) with the model used and credits consumed, oldest first — for credit reporting and incremental polling. Requires a service account in an AI Studio–licensed org',
		{
			workspace_gid: z.string().describe('Workspace or organization GID'),
			start_at: z.string().optional().describe('Inclusive lower bound on when usage was recorded (ISO 8601 date-time)'),
			end_at: z.string().optional().describe('Exclusive upper bound on when usage was recorded (ISO 8601 date-time)'),
			division_gid: divisionGidParam,
			...pageParams,
		},
		async ({ workspace_gid, start_at, end_at, division_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveAiStudioApi(api).listAiStudioRuns(workspace_gid, {
							...paginationOptions(params),
							...(start_at !== undefined && { startAt: start_at }),
							...(end_at !== undefined && { endAt: end_at }),
							...(division_gid !== undefined && { divisionGid: division_gid }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_ai_studio_seat_list',
		'List Asana AI Studio seat allocations — who holds a seat, at what license tier, and its state. Requires a service account in an AI Studio–licensed org',
		{
			workspace_gid: z.string().describe('Workspace or organization GID'),
			state: z.enum(AI_STUDIO_SEAT_FILTER_STATES).optional().describe('Only seats in this state'),
			division_gid: divisionGidParam,
			...pageParams,
		},
		async ({ workspace_gid, state, division_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveAiStudioApi(api).listAiStudioSeats(workspace_gid, {
							...paginationOptions(params),
							...(state !== undefined && { state }),
							...(division_gid !== undefined && { divisionGid: division_gid }),
						}),
					),
				},
			],
		}),
	)
}

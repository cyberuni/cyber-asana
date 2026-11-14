import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { AllocationApi } from './api.js'
import { createAllocation, deleteAllocation, getAllocation, listAllocations, updateAllocation } from './default.js'
import type { AllocationEffort } from './gateway.js'

function resolveAllocationApi(api?: AllocationApi | (() => AllocationApi)): AllocationApi {
	if (typeof api === 'function') return api()
	return api ?? { listAllocations, getAllocation, createAllocation, updateAllocation, deleteAllocation }
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const effortParams = {
	effort_type: z.enum(['hours', 'percent']).optional().describe('hours, or percent of working time'),
	effort_value: z.number().optional().describe('Effort amount, in the unit of effort_type'),
}

function effortOf(params: { effort_type?: 'hours' | 'percent'; effort_value?: number }): AllocationEffort | undefined {
	return params.effort_type !== undefined && params.effort_value !== undefined
		? { type: params.effort_type, value: params.effort_value }
		: undefined
}

const PLAN_NOTE = ' A workspace whose plan has no resource management answers 402.'

export function registerAllocationTools(server: McpServer, api?: AllocationApi | (() => AllocationApi)) {
	server.tool(
		'asana_allocation_list',
		`List Asana allocations (how much of a person is committed to a project), filtered by project, person, or workspace.${PLAN_NOTE}`,
		{
			parent_gid: z.string().optional().describe('Only allocations on this project GID'),
			assignee_gid: z.string().optional().describe('Only allocations of this user GID (me for the caller)'),
			workspace_gid: z.string().optional().describe('Workspace GID'),
			...paginationParams,
		},
		async ({ parent_gid, assignee_gid, workspace_gid, ...params }) =>
			json(
				await resolveAllocationApi(api).listAllocations({
					...paginationOptions(params),
					...(parent_gid !== undefined && { parent: parent_gid }),
					...(assignee_gid !== undefined && { assignee: assignee_gid }),
					...(workspace_gid !== undefined && { workspace: workspace_gid }),
				}),
			),
	)

	server.tool(
		'asana_allocation_get',
		`Get an Asana allocation by GID.${PLAN_NOTE}`,
		{ allocation_gid: z.string().describe('Allocation GID'), ...readParams },
		async ({ allocation_gid, ...params }) =>
			json(await resolveAllocationApi(api).getAllocation(allocation_gid, readOptions(params))),
	)

	server.tool(
		'asana_allocation_create',
		`Allocate a person to a project for a date range, with an optional effort in hours or percent.${PLAN_NOTE}`,
		{
			assignee_gid: z.string().describe('User GID to allocate'),
			parent_gid: z.string().describe('Project GID'),
			start_date: z.string().describe('First day (YYYY-MM-DD)'),
			end_date: z.string().describe('Last day (YYYY-MM-DD)'),
			...effortParams,
		},
		async ({ assignee_gid, parent_gid, start_date, end_date, ...effort }) => {
			const e = effortOf(effort)
			return json(
				await resolveAllocationApi(api).createAllocation({
					assignee: assignee_gid,
					parent: parent_gid,
					start_date,
					end_date,
					...(e && { effort: e }),
				}),
			)
		},
	)

	server.tool(
		'asana_allocation_update',
		`Update an Asana allocation's dates or effort.${PLAN_NOTE}`,
		{
			allocation_gid: z.string().describe('Allocation GID'),
			start_date: z.string().optional().describe('New first day (YYYY-MM-DD)'),
			end_date: z.string().optional().describe('New last day (YYYY-MM-DD)'),
			...effortParams,
		},
		async ({ allocation_gid, start_date, end_date, ...effort }) => {
			const e = effortOf(effort)
			return json(
				await resolveAllocationApi(api).updateAllocation(allocation_gid, {
					...(start_date !== undefined && { start_date }),
					...(end_date !== undefined && { end_date }),
					...(e && { effort: e }),
				}),
			)
		},
	)

	server.tool(
		'asana_allocation_delete',
		'Delete an Asana allocation',
		{ allocation_gid: z.string().describe('Allocation GID') },
		async ({ allocation_gid }) => {
			await resolveAllocationApi(api).deleteAllocation(allocation_gid)
			return json({ ok: true, deleted: allocation_gid })
		},
	)
}

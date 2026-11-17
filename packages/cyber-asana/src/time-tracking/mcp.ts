import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { TimeTrackingEntryApi, TimeTrackingEntryFields } from './api.js'
import {
	createTimeTrackingEntry,
	deleteTimeTrackingEntry,
	getTimeTrackingEntry,
	listTimeTrackingEntries,
	listTimeTrackingEntriesForTask,
	updateTimeTrackingEntry,
} from './default.js'

function resolveTimeTrackingEntryApi(api?: TimeTrackingEntryApi | (() => TimeTrackingEntryApi)): TimeTrackingEntryApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTimeTrackingEntries,
			listTimeTrackingEntriesForTask,
			getTimeTrackingEntry,
			createTimeTrackingEntry,
			updateTimeTrackingEntry,
			deleteTimeTrackingEntry,
		}
	)
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const writeParams = {
	duration_minutes: z.number().positive().optional().describe('Time spent, in minutes'),
	entered_on: z.string().optional().describe('Date the time was spent (YYYY-MM-DD); Asana defaults to today'),
}

function fieldsFrom(params: { duration_minutes?: number; entered_on?: string }): TimeTrackingEntryFields {
	return {
		...(params.duration_minutes !== undefined && { durationMinutes: params.duration_minutes }),
		...(params.entered_on !== undefined && { enteredOn: params.entered_on }),
	}
}

export function registerTimeTrackingEntryTools(
	server: McpServer,
	api?: TimeTrackingEntryApi | (() => TimeTrackingEntryApi),
) {
	server.tool(
		'asana_time_entry_list',
		'List Asana time tracking entries across tasks, filtered by task, user, portfolio, workspace, or period (paid plan)',
		{
			task_gid: z.string().optional().describe('Only entries on this task'),
			user_gid: z.string().optional().describe('Only entries logged by this user'),
			portfolio_gid: z.string().optional().describe('Only entries on tasks in this portfolio'),
			workspace_gid: z.string().optional().describe('Only entries in this workspace'),
			entered_on_start: z.string().optional().describe('Only entries entered on or after this date (YYYY-MM-DD)'),
			entered_on_end: z.string().optional().describe('Only entries entered on or before this date (YYYY-MM-DD)'),
			...paginationParams,
		},
		async ({ task_gid, user_gid, portfolio_gid, workspace_gid, entered_on_start, entered_on_end, ...params }) =>
			json(
				await resolveTimeTrackingEntryApi(api).listTimeTrackingEntries(
					{
						...(task_gid !== undefined && { task: task_gid }),
						...(user_gid !== undefined && { user: user_gid }),
						...(portfolio_gid !== undefined && { portfolio: portfolio_gid }),
						...(workspace_gid !== undefined && { workspace: workspace_gid }),
						...(entered_on_start !== undefined && { enteredOnStart: entered_on_start }),
						...(entered_on_end !== undefined && { enteredOnEnd: entered_on_end }),
					},
					paginationOptions(params),
				),
			),
	)

	server.tool(
		'asana_time_entry_list_for_task',
		"List a task's Asana time tracking entries (paid plan)",
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) =>
			json(await resolveTimeTrackingEntryApi(api).listTimeTrackingEntriesForTask(task_gid, paginationOptions(params))),
	)

	server.tool(
		'asana_time_entry_get',
		'Get an Asana time tracking entry by GID (paid plan)',
		{ time_entry_gid: z.string().describe('Time tracking entry GID'), ...readParams },
		async ({ time_entry_gid, ...params }) =>
			json(await resolveTimeTrackingEntryApi(api).getTimeTrackingEntry(time_entry_gid, readOptions(params))),
	)

	server.tool(
		'asana_time_entry_create',
		'Log time against an Asana task (paid plan). duration_minutes is required',
		{ task_gid: z.string().describe('Task GID'), ...writeParams },
		async ({ task_gid, ...params }) => {
			const fields = fieldsFrom(params)
			if (fields.durationMinutes === undefined) throw new Error('Give duration_minutes')
			return json(await resolveTimeTrackingEntryApi(api).createTimeTrackingEntry(task_gid, fields))
		},
	)

	server.tool(
		'asana_time_entry_update',
		'Update an Asana time tracking entry (paid plan). Give at least one of duration_minutes, entered_on',
		{ time_entry_gid: z.string().describe('Time tracking entry GID'), ...writeParams },
		async ({ time_entry_gid, ...params }) => {
			const fields = fieldsFrom(params)
			if (Object.keys(fields).length === 0) {
				throw new Error('Nothing to update: give at least one of duration_minutes, entered_on')
			}
			return json(await resolveTimeTrackingEntryApi(api).updateTimeTrackingEntry(time_entry_gid, fields))
		},
	)

	server.tool(
		'asana_time_entry_delete',
		'Delete an Asana time tracking entry (paid plan). Succeeds with already_absent when it is already gone',
		{ time_entry_gid: z.string().describe('Time tracking entry GID') },
		async ({ time_entry_gid }) =>
			json(
				await deleteIdempotently('time_tracking_entry', time_entry_gid, () =>
					resolveTimeTrackingEntryApi(api).deleteTimeTrackingEntry(time_entry_gid),
				),
			),
	)
}

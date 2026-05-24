import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import {
	addDependencies,
	addDependents,
	addFollowersToTask,
	addTaskToProject,
	createSubtask,
	createTask,
	deleteTask,
	getDependencies,
	getDependents,
	getMyTasks,
	getTask,
	getTasksByGid,
	listSubtasks,
	listTasks,
	listTasksForSection,
	removeDependencies,
	removeDependents,
	removeFollowersFromTask,
	removeTaskFromProject,
	scanTodos,
	searchTasks,
	type TaskApi,
	updateTask,
} from './api.js'
import { buildTaskCreateFields, buildTaskUpdateFields, parseGidList } from './write-options.js'

function resolveTaskApi(api?: TaskApi | (() => TaskApi)): TaskApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTasks,
			listTasksForSection,
			getTask,
			getTasksByGid,
			createTask,
			updateTask,
			deleteTask,
			getMyTasks,
			listSubtasks,
			createSubtask,
			addTaskToProject,
			removeTaskFromProject,
			addFollowersToTask,
			removeFollowersFromTask,
			getDependencies,
			getDependents,
			addDependencies,
			addDependents,
			removeDependencies,
			removeDependents,
			searchTasks,
		}
	)
}

export function registerTaskTools(server: McpServer, api?: TaskApi | (() => TaskApi)) {
	server.tool(
		'asana_task_list',
		'List Asana tasks in a project',
		{
			project_gid: z.string().describe('Project GID'),
			completed_since: z
				.string()
				.optional()
				.describe('Only include tasks completed on or after this date (ISO 8601, or "now" for incomplete only)'),
			incomplete: z.boolean().optional().describe('Only show incomplete tasks (shorthand for completed_since=now)'),
			...paginationParams,
		},
		async ({ project_gid, completed_since, incomplete, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskApi(api).listTasks(project_gid, {
							completedSince: incomplete ? 'now' : completed_since,
							...paginationOptions(params),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_my_tasks',
		'List My Tasks for the authenticated user',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			completed_since: z
				.string()
				.optional()
				.describe('Only include tasks completed on or after this date (ISO 8601, or "now" for incomplete only)'),
			incomplete: z.boolean().optional().describe('Only show incomplete tasks (shorthand for completed_since=now)'),
			...paginationParams,
		},
		async ({ workspace_gid, completed_since, incomplete, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskApi(api).getMyTasks(workspace_gid, {
							completedSince: incomplete ? 'now' : completed_since,
							...paginationOptions(params),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_subtask_list',
		'List subtasks of an Asana task',
		{
			task_gid: z.string().describe('Parent task GID'),
			incomplete: z.boolean().optional().describe('Only show incomplete subtasks'),
			assignee_email: z
				.boolean()
				.optional()
				.describe('Include assignee email (adds assignee,assignee.email to opt_fields)'),
			follower_emails: z
				.boolean()
				.optional()
				.describe('Include follower emails (adds followers,followers.email to opt_fields)'),
			num_subtasks: z.boolean().optional().describe('Include subtask count (adds num_subtasks to opt_fields)'),
			custom_fields: z.boolean().optional().describe('Include custom fields (adds custom_fields to opt_fields)'),
			...paginationParams,
		},
		async ({ task_gid, incomplete, assignee_email, follower_emails, num_subtasks, custom_fields, ...params }) => {
			const extraFields = [
				assignee_email && 'assignee,assignee.email',
				follower_emails && 'followers,followers.email',
				num_subtasks && 'num_subtasks',
				custom_fields && 'custom_fields',
			]
				.filter(Boolean)
				.join(',')
			const pagination = paginationOptions(params)
			if (extraFields) {
				pagination.optFields = [pagination.optFields, extraFields].filter(Boolean).join(',')
			}
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							await resolveTaskApi(api).listSubtasks(task_gid, { completedSince: incomplete ? 'now' : undefined, ...pagination }),
						),
					},
				],
			}
		},
	)

	server.tool(
		'asana_task_subtask_create',
		'Create a subtask under an Asana task',
		{
			task_gid: z.string().describe('Parent task GID'),
			name: z.string().describe('Subtask name'),
			notes: z.string().optional().describe('Subtask notes'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			assignee_gid: z.string().optional().describe('Assignee user GID'),
		},
		async ({ task_gid, name, notes, due_on, assignee_gid }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTaskApi(api).createSubtask(task_gid, name, { notes, dueOn: due_on, assignee: assignee_gid })),
				},
			],
		}),
	)

	server.tool(
		'asana_task_get',
		'Get an Asana task by GID',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTaskApi(api).getTask(task_gid)) }],
		}),
	)

	server.tool(
		'asana_task_get_many',
		'Get multiple Asana tasks by GID',
		{
			task_gids: z.array(z.string()).describe('Task GIDs'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({ task_gids, opt_fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTaskApi(api).getTasksByGid(task_gids, opt_fields ? { optFields: opt_fields } : undefined)),
				},
			],
		}),
	)

	server.tool(
		'asana_task_create',
		'Create a new Asana task',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Task name'),
			project_gid: z.string().optional().describe('Project GID'),
			project_gids: z.array(z.string()).optional().describe('Project GIDs'),
			follower_gids: z
				.union([z.array(z.string()), z.string()])
				.optional()
				.describe('Follower user GIDs'),
			assignee_gid: z.string().optional().describe('Assignee user GID'),
			notes: z.string().optional().describe('Task notes'),
			html_notes: z.string().optional().describe('Task notes as HTML'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			parent_gid: z.string().optional().describe('Parent task GID'),
			resource_subtype: z.string().optional().describe('Task resource subtype'),
			custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by GID'),
		},
		async ({
			workspace_gid,
			name,
			project_gid,
			project_gids,
			follower_gids,
			assignee_gid,
			notes,
			html_notes,
			due_on,
			parent_gid,
			resource_subtype,
			custom_fields,
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
					await resolveTaskApi(api).createTask(
						workspace_gid,
							name,
							buildTaskCreateFields({
								notes,
								htmlNotes: html_notes,
								assignee: assignee_gid,
								projectGids: project_gids ?? parseGidList(project_gid),
								followerGids: typeof follower_gids === 'string' ? parseGidList(follower_gids) : follower_gids,
								dueOn: due_on,
								parent: parent_gid,
								resourceSubtype: resource_subtype,
								customFields: custom_fields,
							}),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_update',
		'Update an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			name: z.string().optional().describe('New name'),
			notes: z.string().optional().describe('New notes'),
			html_notes: z.string().optional().describe('New notes as HTML'),
			completed: z.boolean().optional().describe('Mark as completed'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			clear_due_on: z.boolean().optional().describe('Clear the due date'),
			assignee_gid: z.string().optional().describe('Assignee user GID'),
			parent_gid: z.string().optional().describe('Parent task GID'),
			clear_parent: z.boolean().optional().describe('Remove the parent task relationship'),
			resource_subtype: z.string().optional().describe('Task resource subtype'),
			custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by GID'),
		},
		async ({
			task_gid,
			name,
			notes,
			html_notes,
			completed,
			due_on,
			clear_due_on,
			assignee_gid,
			parent_gid,
			clear_parent,
			resource_subtype,
			custom_fields,
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
					await resolveTaskApi(api).updateTask(
						task_gid,
							buildTaskUpdateFields({
								name,
								notes,
								htmlNotes: html_notes,
								completed,
								dueOn: due_on,
								clearDueOn: clear_due_on,
								assignee: assignee_gid,
								parent: parent_gid,
								clearParent: clear_parent,
								resourceSubtype: resource_subtype,
								customFields: custom_fields,
							}),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_delete',
		'Delete an Asana task',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => {
		await resolveTaskApi(api).deleteTask(task_gid)
		return { content: [{ type: 'text', text: `Deleted task ${task_gid}` }] }
		},
	)

	server.tool(
		'asana_task_search',
		'Search Asana tasks in a workspace',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			text: z.string().optional().describe('Search text'),
			completed: z.boolean().optional().describe('Filter by completion status'),
			is_subtask: z.boolean().optional().describe('Filter subtasks only (true) or exclude subtasks (false)'),
			has_attachment: z.boolean().optional().describe('Only tasks with attachments'),
			is_blocking: z.boolean().optional().describe('Only tasks blocking other tasks'),
			is_blocked: z.boolean().optional().describe('Only tasks blocked by other tasks'),
			assignee_any: z.string().optional().describe('Comma-separated assignee GIDs (any match)'),
			assignee_not: z.string().optional().describe('Comma-separated assignee GIDs to exclude'),
			projects_any: z.string().optional().describe('Comma-separated project GIDs (any match)'),
			projects_not: z.string().optional().describe('Comma-separated project GIDs to exclude'),
			projects_all: z.string().optional().describe('Comma-separated project GIDs (all must match)'),
			sections_any: z.string().optional().describe('Comma-separated section GIDs (any match)'),
			sections_not: z.string().optional().describe('Comma-separated section GIDs to exclude'),
			sections_all: z.string().optional().describe('Comma-separated section GIDs (all must match)'),
			tags_any: z.string().optional().describe('Comma-separated tag GIDs (any match)'),
			tags_not: z.string().optional().describe('Comma-separated tag GIDs to exclude'),
			tags_all: z.string().optional().describe('Comma-separated tag GIDs (all must match)'),
			teams_any: z.string().optional().describe('Comma-separated team GIDs (any match)'),
			portfolios_any: z.string().optional().describe('Comma-separated portfolio GIDs (any match)'),
			followers_any: z.string().optional().describe('Comma-separated follower user GIDs (any match)'),
			followers_not: z.string().optional().describe('Comma-separated follower user GIDs to exclude'),
			created_by_any: z.string().optional().describe('Comma-separated created-by user GIDs (any match)'),
			created_by_not: z.string().optional().describe('Comma-separated created-by user GIDs to exclude'),
			assigned_by_any: z.string().optional().describe('Comma-separated assigned-by user GIDs (any match)'),
			assigned_by_not: z.string().optional().describe('Comma-separated assigned-by user GIDs to exclude'),
			liked_by_not: z.string().optional().describe('Comma-separated user GIDs who did not like the task'),
			commented_on_by_not: z.string().optional().describe('Comma-separated user GIDs who did not comment on the task'),
			due_on: z.string().optional().describe('Exact due date (YYYY-MM-DD)'),
			due_on_before: z.string().optional().describe('Due date before (YYYY-MM-DD)'),
			due_on_after: z.string().optional().describe('Due date after (YYYY-MM-DD)'),
			due_at_before: z.string().optional().describe('Due datetime before (ISO 8601)'),
			due_at_after: z.string().optional().describe('Due datetime after (ISO 8601)'),
			start_on: z.string().optional().describe('Exact start date (YYYY-MM-DD)'),
			start_on_before: z.string().optional().describe('Start date before (YYYY-MM-DD)'),
			start_on_after: z.string().optional().describe('Start date after (YYYY-MM-DD)'),
			created_on: z.string().optional().describe('Exact creation date (YYYY-MM-DD)'),
			created_on_before: z.string().optional().describe('Creation date before (YYYY-MM-DD)'),
			created_on_after: z.string().optional().describe('Creation date after (YYYY-MM-DD)'),
			created_at_before: z.string().optional().describe('Creation datetime before (ISO 8601)'),
			created_at_after: z.string().optional().describe('Creation datetime after (ISO 8601)'),
			completed_on: z.string().optional().describe('Exact completion date (YYYY-MM-DD)'),
			completed_on_before: z.string().optional().describe('Completion date before (YYYY-MM-DD)'),
			completed_on_after: z.string().optional().describe('Completion date after (YYYY-MM-DD)'),
			completed_at_before: z.string().optional().describe('Completion datetime before (ISO 8601)'),
			completed_at_after: z.string().optional().describe('Completion datetime after (ISO 8601)'),
			modified_on: z.string().optional().describe('Exact modification date (YYYY-MM-DD)'),
			modified_on_before: z.string().optional().describe('Modification date before (YYYY-MM-DD)'),
			modified_on_after: z.string().optional().describe('Modification date after (YYYY-MM-DD)'),
			modified_at_before: z.string().optional().describe('Modification datetime before (ISO 8601)'),
			modified_at_after: z.string().optional().describe('Modification datetime after (ISO 8601)'),
			resource_subtype: z.string().optional().describe('Resource subtype filter (e.g. milestone)'),
			sort_by: z.string().optional().describe('Sort field: due_date, created_at, completed_at, likes, modified_at'),
			sort_ascending: z.boolean().optional().describe('Sort ascending (default: descending)'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({
			workspace_gid,
			text,
			assignee_any,
			assignee_not,
			projects_any,
			projects_not,
			projects_all,
			sections_any,
			sections_not,
			sections_all,
			tags_any,
			tags_not,
			tags_all,
			teams_any,
			portfolios_any,
			followers_any,
			followers_not,
			created_by_any,
			created_by_not,
			assigned_by_any,
			assigned_by_not,
			liked_by_not,
			commented_on_by_not,
			due_on,
			due_on_before,
			due_on_after,
			due_at_before,
			due_at_after,
			start_on,
			start_on_before,
			start_on_after,
			created_on,
			created_on_before,
			created_on_after,
			created_at_before,
			created_at_after,
			completed_on,
			completed_on_before,
			completed_on_after,
			completed_at_before,
			completed_at_after,
			modified_on,
			modified_on_before,
			modified_on_after,
			modified_at_before,
			modified_at_after,
			...rest
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskApi(api).searchTasks(workspace_gid, {
							text,
							completed: rest.completed,
							isSubtask: rest.is_subtask,
							hasAttachment: rest.has_attachment,
							isBlocking: rest.is_blocking,
							isBlocked: rest.is_blocked,
							assigneeAny: assignee_any,
							assigneeNot: assignee_not,
							projectsAny: projects_any,
							projectsNot: projects_not,
							projectsAll: projects_all,
							sectionsAny: sections_any,
							sectionsNot: sections_not,
							sectionsAll: sections_all,
							tagsAny: tags_any,
							tagsNot: tags_not,
							tagsAll: tags_all,
							teamsAny: teams_any,
							portfoliosAny: portfolios_any,
							followersAny: followers_any,
							followersNot: followers_not,
							createdByAny: created_by_any,
							createdByNot: created_by_not,
							assignedByAny: assigned_by_any,
							assignedByNot: assigned_by_not,
							likedByNot: liked_by_not,
							commentedOnByNot: commented_on_by_not,
							dueOn: due_on,
							dueOnBefore: due_on_before,
							dueOnAfter: due_on_after,
							dueAtBefore: due_at_before,
							dueAtAfter: due_at_after,
							startOn: start_on,
							startOnBefore: start_on_before,
							startOnAfter: start_on_after,
							createdOn: created_on,
							createdOnBefore: created_on_before,
							createdOnAfter: created_on_after,
							createdAtBefore: created_at_before,
							createdAtAfter: created_at_after,
							completedOn: completed_on,
							completedOnBefore: completed_on_before,
							completedOnAfter: completed_on_after,
							completedAtBefore: completed_at_before,
							completedAtAfter: completed_at_after,
							modifiedOn: modified_on,
							modifiedOnBefore: modified_on_before,
							modifiedOnAfter: modified_on_after,
							modifiedAtBefore: modified_at_before,
							modifiedAtAfter: modified_at_after,
							resourceSubtype: rest.resource_subtype,
							sortBy: rest.sort_by,
							sortAscending: rest.sort_ascending,
							optFields: rest.opt_fields,
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_follower_add',
		'Add followers to an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to add as followers'),
		},
		async ({ task_gid, follower_gids }) => {
		await resolveTaskApi(api).addFollowersToTask(task_gid, follower_gids)
		return { content: [{ type: 'text', text: `Added ${follower_gids.length} follower(s) to task ${task_gid}` }] }
		},
	)

	server.tool(
		'asana_task_follower_remove',
		'Remove followers from an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to remove as followers'),
		},
		async ({ task_gid, follower_gids }) => {
			await resolveTaskApi(api).removeFollowersFromTask(task_gid, follower_gids)
			return {
				content: [{ type: 'text', text: `Removed ${follower_gids.length} follower(s) from task ${task_gid}` }],
			}
		},
	)

	server.tool(
		'asana_task_project_add',
		'Add an Asana task to a project, optionally into a specific section and position',
		{
			task_gid: z.string().describe('Task GID'),
			project_gid: z.string().describe('Project GID'),
			section_gid: z.string().optional().describe('Section GID to place the task into'),
			insert_after: z.string().optional().describe('Task GID to insert after'),
			insert_before: z.string().optional().describe('Task GID to insert before'),
		},
		async ({ task_gid, project_gid, section_gid, insert_after, insert_before }) => {
			await resolveTaskApi(api).addTaskToProject(task_gid, project_gid, {
				sectionGid: section_gid,
				insertAfter: insert_after,
				insertBefore: insert_before,
			})
			return { content: [{ type: 'text', text: `Added task ${task_gid} to project ${project_gid}` }] }
		},
	)

	server.tool(
		'asana_task_project_remove',
		'Remove an Asana task from a project',
		{
			task_gid: z.string().describe('Task GID'),
			project_gid: z.string().describe('Project GID'),
		},
		async ({ task_gid, project_gid }) => {
		await resolveTaskApi(api).removeTaskFromProject(task_gid, project_gid)
		return { content: [{ type: 'text', text: `Removed task ${task_gid} from project ${project_gid}` }] }
		},
	)

	server.tool(
		'asana_task_dependency_list',
		'List dependencies of an Asana task (tasks this task depends on)',
		{
			task_gid: z.string().describe('Task GID'),
			opt_fields: z.string().optional().describe('Comma-separated Asana fields to include'),
		},
		async ({ task_gid, opt_fields }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTaskApi(api).getDependencies(task_gid, { optFields: opt_fields })) }],
		}),
	)

	server.tool(
		'asana_task_dependency_add',
		'Add dependencies to an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			dependency_gids: z.array(z.string()).describe('GIDs of tasks to add as dependencies'),
		},
		async ({ task_gid, dependency_gids }) => {
		await resolveTaskApi(api).addDependencies(task_gid, dependency_gids)
		return { content: [{ type: 'text', text: `Added ${dependency_gids.length} dependency(s) to task ${task_gid}` }] }
		},
	)

	server.tool(
		'asana_task_dependency_remove',
		'Remove dependencies from an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			dependency_gids: z.array(z.string()).describe('GIDs of tasks to remove as dependencies'),
		},
		async ({ task_gid, dependency_gids }) => {
		await resolveTaskApi(api).removeDependencies(task_gid, dependency_gids)
		return {
			content: [{ type: 'text', text: `Removed ${dependency_gids.length} dependency(s) from task ${task_gid}` }],
			}
		},
	)

	server.tool(
		'asana_task_dependent_list',
		'List dependents of an Asana task (tasks that depend on this task)',
		{
			task_gid: z.string().describe('Task GID'),
			opt_fields: z.string().optional().describe('Comma-separated Asana fields to include'),
		},
		async ({ task_gid, opt_fields }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTaskApi(api).getDependents(task_gid, { optFields: opt_fields })) }],
		}),
	)

	server.tool(
		'asana_task_dependent_add',
		'Add dependents to an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			dependent_gids: z.array(z.string()).describe('GIDs of tasks to add as dependents'),
		},
		async ({ task_gid, dependent_gids }) => {
		await resolveTaskApi(api).addDependents(task_gid, dependent_gids)
		return { content: [{ type: 'text', text: `Added ${dependent_gids.length} dependent(s) to task ${task_gid}` }] }
		},
	)

	server.tool(
		'asana_task_dependent_remove',
		'Remove dependents from an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			dependent_gids: z.array(z.string()).describe('GIDs of tasks to remove as dependents'),
		},
		async ({ task_gid, dependent_gids }) => {
		await resolveTaskApi(api).removeDependents(task_gid, dependent_gids)
		return {
			content: [{ type: 'text', text: `Removed ${dependent_gids.length} dependent(s) from task ${task_gid}` }],
			}
		},
	)

	server.tool(
		'asana_task_scan_todos',
		'Scan source files in a directory for TODO/FIXME/HACK/XXX comments and return structured results for LLM review',
		{
			dir: z.string().optional().describe('Root directory to scan (defaults to current working directory)'),
			extensions: z.string().optional().describe('Comma-separated file extensions to scan (e.g. ".ts,.py")'),
			exclude: z.string().optional().describe('Comma-separated directory names to skip (e.g. "node_modules,dist")'),
		},
		async ({ dir, extensions, exclude }) => {
			const root = dir ?? process.cwd()
			const data = await scanTodos(root, {
				extensions: extensions?.split(',').map((e) => e.trim()),
				exclude: exclude?.split(',').map((e) => e.trim()),
			})
			return { content: [{ type: 'text', text: JSON.stringify(data) }] }
		},
	)
}

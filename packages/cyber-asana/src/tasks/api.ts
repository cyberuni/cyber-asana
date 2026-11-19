import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { listItems, type PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { type CompletionFilter, listWithCompletionFilter } from './completion-filter.js'
import type {
	CreateTaskFields,
	DuplicateTaskFields,
	SearchTasksOptions,
	TaskBatchLookupResult,
	TaskGateway,
	UpdateTaskFields,
} from './gateway.js'

import { assertOnePosition } from './write-options.js'

export type { CompletionFilter } from './completion-filter.js'
export type { TaskBatchLookupFailure, TaskBatchLookupSuccess, TaskCustomFields } from './gateway.js'
export type { CreateTaskFields, SearchTasksOptions, TaskBatchLookupResult, UpdateTaskFields }

/** Where `reorderSubtask` puts a subtask among its siblings: before or after one of them. */
export type SubtaskPosition = { insertBefore?: string; insertAfter?: string }

/** A section's or My Tasks' list options: pagination plus the two completion filters. */
export type TaskCollectionOptions = PaginationOptions & CompletionFilter

/** What narrows a `GET /tasks` list: a section, or an assignee together with their workspace (a project is the first argument). */
export type TaskListScope = { section?: string; assignee?: string; workspace?: string }

/** A project's task list options; `customType` filters by custom type GID ("" for tasks with none). */
export type TaskListOptions = TaskCollectionOptions & TaskListScope & { customType?: string; modifiedSince?: string }

/**
 * Check a task list's filter locally, so a bad combination fails before any request. Asana wants exactly one
 * of a project, a section, or an assignee with their workspace; `assignee` and `workspace` only work as a pair.
 */
function assertTaskListScope(projectGid: string | undefined, opts: TaskListOptions | undefined) {
	const { section, assignee, workspace, modifiedSince } = opts ?? {}
	if ((assignee === undefined) !== (workspace === undefined)) {
		throw new Error('--assignee and --workspace must be given together')
	}
	const filters = [projectGid, section, assignee].filter((value) => value !== undefined)
	if (filters.length === 0) throw new Error('give one of --project, --section, or --assignee with --workspace')
	if (filters.length > 1) throw new Error('use only one of --project, --section, or --assignee with --workspace')
	if (modifiedSince !== undefined && Number.isNaN(Date.parse(modifiedSince))) {
		throw new Error(`--modified-since must be an ISO 8601 date or time, got "${modifiedSince}"`)
	}
}

/** `since` keeps stories created at or after that ISO 8601 time; Asana has no such filter, so it applies here. */
export type TaskWithStoriesOptions = ReadOptions & { since?: string }

/** Story fields `task get --with-stories` returns; `created_at` is what `since` filters on. */
const TASK_STORY_FIELDS = 'gid,type,resource_subtype,text,created_at,created_by.name'

function parseSince(since: string | undefined) {
	if (since === undefined) return undefined
	const time = Date.parse(since)
	if (Number.isNaN(time)) throw new Error(`--since must be an ISO 8601 time, got "${since}"`)
	return time
}

export type TodoMatch = {
	file: string
	line: number
	pattern: string
	text: string
}

const TODO_RE = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rs', '.java', '.rb']
const DEFAULT_EXCLUDE = ['node_modules', 'dist', '.git', 'build', 'coverage', '__pycache__']

async function* walkFiles(dir: string, extensions: string[], exclude: string[]): AsyncGenerator<string> {
	let entries: { name: string; isDirectory(): boolean }[]
	try {
		entries = (await readdir(dir, { withFileTypes: true, encoding: 'utf-8' })) as {
			name: string
			isDirectory(): boolean
		}[]
	} catch {
		return
	}
	for (const entry of entries) {
		if (exclude.includes(entry.name)) continue
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			yield* walkFiles(fullPath, extensions, exclude)
		} else if (extensions.some((ext) => entry.name.endsWith(ext))) {
			yield fullPath
		}
	}
}

export async function scanTodos(
	rootDir: string,
	opts?: { extensions?: string[]; exclude?: string[] },
): Promise<TodoMatch[]> {
	const extensions = opts?.extensions ?? DEFAULT_EXTENSIONS
	const exclude = opts?.exclude ?? DEFAULT_EXCLUDE
	const results: TodoMatch[] = []
	for await (const file of walkFiles(rootDir, extensions, exclude)) {
		const content = await readFile(file, 'utf-8')
		for (const [i, line] of content.split('\n').entries()) {
			const match = TODO_RE.exec(line)
			if (match) {
				results.push({
					file: path.relative(rootDir, file),
					line: i + 1,
					pattern: match[1].toUpperCase(),
					text: match[2].trim(),
				})
			}
		}
	}
	return results
}

export type TaskApi = ReturnType<typeof createTaskApi>

export function createTaskApi(gateway: TaskGateway) {
	return {
		async listTasks(projectGid: string | undefined, opts?: TaskListOptions) {
			assertTaskListScope(projectGid, opts)
			return listWithCompletionFilter(opts, (o) => gateway.listTasks(projectGid, o))
		},
		listTasksForSection(sectionGid: string, opts?: TaskCollectionOptions) {
			return listWithCompletionFilter(opts, (o) => gateway.listTasksForSection(sectionGid, o))
		},
		getTask(taskGid: string, opts?: ReadOptions) {
			return gateway.getTask(taskGid, opts)
		},
		async getTaskWithStories(taskGid: string, opts?: TaskWithStoriesOptions) {
			const { since, ...readOptions } = opts ?? {}
			const sinceTime = parseSince(since)
			const [task, stories] = await Promise.all([
				gateway.getTask(taskGid, Object.keys(readOptions).length > 0 ? readOptions : undefined),
				// Page until done: a task's history is read whole, then filtered.
				gateway.listStories(taskGid, {
					optFields: TASK_STORY_FIELDS,
					fetchAll: true,
					maxPages: Number.POSITIVE_INFINITY,
				}),
			])
			const items = listItems(stories) as { created_at?: string }[]
			return {
				...task,
				stories:
					sinceTime === undefined
						? items
						: items.filter((story) => story.created_at !== undefined && Date.parse(story.created_at) >= sinceTime),
			}
		},
		getTasksByGid(taskGids: string[], opts?: { optFields?: string }) {
			return gateway.getTasksByGid(taskGids, opts)
		},
		createTask(workspaceGid: string, name: string, fields?: CreateTaskFields, opts?: ReadOptions) {
			return gateway.createTask(workspaceGid, name, fields, opts)
		},
		updateTask(taskGid: string, fields: UpdateTaskFields, opts?: ReadOptions) {
			return gateway.updateTask(taskGid, fields, opts)
		},
		deleteTask(taskGid: string) {
			return gateway.deleteTask(taskGid)
		},
		getMyTasks(workspaceGid: string, opts?: TaskCollectionOptions) {
			return listWithCompletionFilter(opts, (o) => gateway.getMyTasks(workspaceGid, o))
		},
		listSubtasks(taskGid: string, opts?: TaskCollectionOptions) {
			return listWithCompletionFilter(opts, (o) => gateway.listSubtasks(taskGid, o))
		},
		listProjectsForTask(taskGid: string, opts?: PaginationOptions) {
			return gateway.listProjectsForTask(taskGid, opts)
		},
		duplicateTask(taskGid: string, fields: DuplicateTaskFields, opts?: ReadOptions) {
			return gateway.duplicateTask(taskGid, fields, opts)
		},
		/**
		 * Move a subtask within the parent it already has. Asana treats setting the same parent again
		 * as a no-op unless a position comes with it, so this reads the parent and sends it back with one.
		 */
		async reorderSubtask(taskGid: string, position: SubtaskPosition, opts?: ReadOptions) {
			if (position.insertBefore === undefined && position.insertAfter === undefined) {
				throw new Error('give one of --insert-before or --insert-after')
			}
			assertOnePosition(position)
			const task = await gateway.getTask(taskGid, { optFields: 'parent' })
			const parent = task.parent?.gid
			if (!parent) throw new Error(`task ${taskGid} has no parent; set one with \`task update --parent\``)
			return gateway.updateTask(
				taskGid,
				{
					parent,
					...(position.insertBefore !== undefined && { insert_before: position.insertBefore }),
					...(position.insertAfter !== undefined && { insert_after: position.insertAfter }),
				},
				opts,
			)
		},
		createSubtask(parentTaskGid: string, name: string, fields?: CreateTaskFields, opts?: ReadOptions) {
			return gateway.createSubtask(parentTaskGid, name, fields, opts)
		},
		addTaskToProject(
			taskGid: string,
			projectGid: string,
			opts?: { sectionGid?: string; insertAfter?: string; insertBefore?: string },
		) {
			return gateway.addTaskToProject(taskGid, projectGid, opts)
		},
		removeTaskFromProject(taskGid: string, projectGid: string) {
			return gateway.removeTaskFromProject(taskGid, projectGid)
		},
		addFollowersToTask(taskGid: string, followerGids: string[]) {
			return gateway.addFollowersToTask(taskGid, followerGids)
		},
		removeFollowersFromTask(taskGid: string, followerGids: string[]) {
			return gateway.removeFollowersFromTask(taskGid, followerGids)
		},
		getDependencies(taskGid: string, opts?: PaginationOptions) {
			return gateway.getDependencies(taskGid, opts)
		},
		getDependents(taskGid: string, opts?: PaginationOptions) {
			return gateway.getDependents(taskGid, opts)
		},
		addDependencies(taskGid: string, dependencyGids: string[]) {
			return gateway.addDependencies(taskGid, dependencyGids)
		},
		addDependents(taskGid: string, dependentGids: string[]) {
			return gateway.addDependents(taskGid, dependentGids)
		},
		removeDependencies(taskGid: string, dependencyGids: string[]) {
			return gateway.removeDependencies(taskGid, dependencyGids)
		},
		removeDependents(taskGid: string, dependentGids: string[]) {
			return gateway.removeDependents(taskGid, dependentGids)
		},
		searchTasks(workspaceGid: string, opts?: SearchTasksOptions) {
			return gateway.searchTasks(workspaceGid, opts)
		},
	}
}

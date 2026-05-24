import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import {
	createAsanaTaskGateway,
	type CreateTaskFields,
	type SearchTasksOptions,
	type TaskBatchLookupResult,
	type TaskGateway,
	type UpdateTaskFields,
} from './gateway.js'

export type { CreateTaskFields, SearchTasksOptions, TaskBatchLookupResult, UpdateTaskFields }
export type { TaskBatchLookupSuccess, TaskBatchLookupFailure, TaskCustomFields } from './gateway.js'

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
		listTasks(projectGid: string, opts?: PaginationOptions & { completedSince?: string }) {
			return gateway.listTasks(projectGid, opts)
		},
		listTasksForSection(sectionGid: string, opts?: PaginationOptions & { completedSince?: string }) {
			return gateway.listTasksForSection(sectionGid, opts)
		},
		getTask(taskGid: string) {
			return gateway.getTask(taskGid)
		},
		getTasksByGid(taskGids: string[], opts?: { optFields?: string }) {
			return gateway.getTasksByGid(taskGids, opts)
		},
		createTask(workspaceGid: string, name: string, opts?: CreateTaskFields) {
			return gateway.createTask(workspaceGid, name, opts)
		},
		updateTask(taskGid: string, fields: UpdateTaskFields) {
			return gateway.updateTask(taskGid, fields)
		},
		deleteTask(taskGid: string) {
			return gateway.deleteTask(taskGid)
		},
		getMyTasks(workspaceGid: string, opts?: PaginationOptions & { completedSince?: string }) {
			return gateway.getMyTasks(workspaceGid, opts)
		},
		listSubtasks(taskGid: string, opts?: PaginationOptions & { completedSince?: string }) {
			return gateway.listSubtasks(taskGid, opts)
		},
		createSubtask(
			parentTaskGid: string,
			name: string,
			opts?: { notes?: string; assignee?: string; dueOn?: string },
		) {
			return gateway.createSubtask(parentTaskGid, name, opts)
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
		getDependencies(taskGid: string, opts?: { optFields?: string }) {
			return gateway.getDependencies(taskGid, opts)
		},
		getDependents(taskGid: string, opts?: { optFields?: string }) {
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

function defaultTaskApi() {
	return createTaskApi(createAsanaTaskGateway(createClient()))
}

export async function listTasks(projectGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	return defaultTaskApi().listTasks(projectGid, opts)
}

export async function listTasksForSection(sectionGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	return defaultTaskApi().listTasksForSection(sectionGid, opts)
}

export async function getTask(taskGid: string) {
	return defaultTaskApi().getTask(taskGid)
}

export async function getTasksByGid(
	taskGids: string[],
	opts?: { optFields?: string },
): Promise<TaskBatchLookupResult[]> {
	return defaultTaskApi().getTasksByGid(taskGids, opts)
}

export async function createTask(workspaceGid: string, name: string, opts?: CreateTaskFields) {
	return defaultTaskApi().createTask(workspaceGid, name, opts)
}

export async function updateTask(taskGid: string, fields: UpdateTaskFields) {
	return defaultTaskApi().updateTask(taskGid, fields)
}

export async function deleteTask(taskGid: string) {
	return defaultTaskApi().deleteTask(taskGid)
}

export async function getMyTasks(workspaceGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	return defaultTaskApi().getMyTasks(workspaceGid, opts)
}

export async function listSubtasks(taskGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	return defaultTaskApi().listSubtasks(taskGid, opts)
}

export async function createSubtask(
	parentTaskGid: string,
	name: string,
	opts?: { notes?: string; assignee?: string; dueOn?: string },
) {
	return defaultTaskApi().createSubtask(parentTaskGid, name, opts)
}

export async function addTaskToProject(
	taskGid: string,
	projectGid: string,
	opts?: { sectionGid?: string; insertAfter?: string; insertBefore?: string },
) {
	return defaultTaskApi().addTaskToProject(taskGid, projectGid, opts)
}

export async function removeTaskFromProject(taskGid: string, projectGid: string) {
	return defaultTaskApi().removeTaskFromProject(taskGid, projectGid)
}

export async function addFollowersToTask(taskGid: string, followerGids: string[]) {
	return defaultTaskApi().addFollowersToTask(taskGid, followerGids)
}

export async function removeFollowersFromTask(taskGid: string, followerGids: string[]) {
	return defaultTaskApi().removeFollowersFromTask(taskGid, followerGids)
}

export async function getDependencies(taskGid: string, opts?: { optFields?: string }) {
	return defaultTaskApi().getDependencies(taskGid, opts)
}

export async function getDependents(taskGid: string, opts?: { optFields?: string }) {
	return defaultTaskApi().getDependents(taskGid, opts)
}

export async function addDependencies(taskGid: string, dependencyGids: string[]) {
	return defaultTaskApi().addDependencies(taskGid, dependencyGids)
}

export async function addDependents(taskGid: string, dependentGids: string[]) {
	return defaultTaskApi().addDependents(taskGid, dependentGids)
}

export async function removeDependencies(taskGid: string, dependencyGids: string[]) {
	return defaultTaskApi().removeDependencies(taskGid, dependencyGids)
}

export async function removeDependents(taskGid: string, dependentGids: string[]) {
	return defaultTaskApi().removeDependents(taskGid, dependentGids)
}

export async function searchTasks(workspaceGid: string, opts?: SearchTasksOptions) {
	return defaultTaskApi().searchTasks(workspaceGid, opts)
}

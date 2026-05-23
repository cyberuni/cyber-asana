import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import Asana from 'asana'
import { createClient } from '../client.js'

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

export async function listTasks(projectGid: string, opts?: { completedSince?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForProject(projectGid, {
		completed_since: opts?.completedSince,
	})
	return res.data
}

export async function listTasksForSection(sectionGid: string, opts?: { completedSince?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForSection(sectionGid, {
		completed_since: opts?.completedSince,
	})
	return res.data
}

export async function getTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTask(taskGid, {})
	return res.data
}

export async function createTask(
	workspaceGid: string,
	name: string,
	opts?: { notes?: string; assignee?: string; projects?: string[]; due_on?: string },
) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.createTask({
		data: {
			name,
			workspace: workspaceGid,
			...opts,
			projects: opts?.projects?.map((gid) => ({ gid })),
		},
	})
	return res.data
}

export async function updateTask(
	taskGid: string,
	fields: { name?: string; notes?: string; completed?: boolean; due_on?: string; assignee?: string },
) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.updateTask({ data: fields }, taskGid, {})
	return res.data
}

export async function deleteTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	await api.deleteTask(taskGid)
}

export async function searchTasks(workspaceGid: string, text: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.searchTasksForWorkspace(workspaceGid, { text })
	return res.data
}

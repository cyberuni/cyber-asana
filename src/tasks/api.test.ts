import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import Asana from 'asana'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createTask,
	deleteTask,
	getTask,
	listTasks,
	listTasksForSection,
	scanTodos,
	searchTasks,
	updateTask,
} from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockTask = { gid: '456', name: 'Test Task' }

describe('tasks/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTasks calls getTasksForProject', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await listTasks('proj1')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: undefined,
			limit: 100,
		})
	})

	it('getTask calls getTask with gid', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTask').mockResolvedValue({ data: mockTask } as never)
		const result = await getTask('456')
		expect(result).toEqual(mockTask)
	})

	it('createTask calls createTask with body', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'createTask').mockResolvedValue({ data: mockTask } as never)
		const result = await createTask('ws1', 'Test Task')
		expect(result).toEqual(mockTask)
		expect(Asana.TasksApi.prototype.createTask).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ name: 'Test Task' }) }),
		)
	})

	it('updateTask calls updateTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'updateTask').mockResolvedValue({
			data: { ...mockTask, completed: true },
		} as never)
		const result = await updateTask('456', { completed: true })
		expect(result).toEqual({ ...mockTask, completed: true })
	})

	it('deleteTask calls deleteTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'deleteTask').mockResolvedValue(undefined as never)
		await deleteTask('456')
		expect(Asana.TasksApi.prototype.deleteTask).toHaveBeenCalledWith('456')
	})

	it('searchTasks calls searchTasksForWorkspace with text', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await searchTasks('ws1', { text: 'query' })
		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.searchTasksForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ text: 'query' }),
		)
	})

	it('listTasks passes completed_since to SDK', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
		} as never)
		await listTasks('proj1', { completedSince: '2024-01-01' })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: '2024-01-01',
			limit: 100,
		})
	})

	it('listTasks forwards pagination options and returns next page metadata', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
			_response: { next_page: { offset: 'next-offset' } },
		} as never)

		const result = await listTasks('proj1', {
			completedSince: 'now',
			limit: 25,
			offset: 'current-offset',
			optFields: 'gid,name',
		} as never)

		expect(result).toEqual({ data: [mockTask], next_page: { offset: 'next-offset' }, limit: 25 })
		expect(Asana.TasksApi.prototype.getTasksForProject).toHaveBeenCalledWith('proj1', {
			completed_since: 'now',
			limit: 25,
			offset: 'current-offset',
			opt_fields: 'gid,name',
		})
	})

	it('listTasks fetches all pages up to max_pages', async () => {
		const nextPage = vi.fn().mockResolvedValue({
			data: [{ gid: '789', name: 'Next Task' }],
			_response: { next_page: { offset: 'third-offset' } },
			nextPage: vi.fn(),
		})
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({
			data: [mockTask],
			_response: { next_page: { offset: 'second-offset' } },
			nextPage,
		} as never)

		const result = await listTasks('proj1', { fetchAll: true, maxPages: 2 })

		expect(result).toEqual({
			data: [mockTask, { gid: '789', name: 'Next Task' }],
			next_page: { offset: 'third-offset' },
			limit: 100,
			page_count: 2,
			truncated: true,
		})
		expect(nextPage).toHaveBeenCalledTimes(1)
	})

	it('listTasksForSection calls getTasksForSection', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForSection').mockResolvedValue({
			data: [mockTask],
		} as never)
		const result = await listTasksForSection('sec1')
		expect(result).toEqual({ data: [mockTask], next_page: null, limit: 100 })
		expect(Asana.TasksApi.prototype.getTasksForSection).toHaveBeenCalledWith('sec1', {
			completed_since: undefined,
			limit: 100,
		})
	})
})

describe('scanTodos', () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = path.join(tmpdir(), `scan-todos-test-${Date.now()}`)
		await mkdir(tmpDir, { recursive: true })
	})

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true })
	})

	it('finds TODO and FIXME comments', async () => {
		await writeFile(path.join(tmpDir, 'foo.ts'), '// TODO: fix this\nconst x = 1\n// FIXME: broken\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(2)
		expect(results[0]).toMatchObject({ line: 1, pattern: 'TODO', text: 'fix this' })
		expect(results[1]).toMatchObject({ line: 3, pattern: 'FIXME', text: 'broken' })
	})

	it('returns relative file paths', async () => {
		await writeFile(path.join(tmpDir, 'bar.ts'), '// TODO: relative path test\n')
		const results = await scanTodos(tmpDir)
		expect(results[0]?.file).toBe('bar.ts')
	})

	it('skips excluded directories', async () => {
		const nodeModules = path.join(tmpDir, 'node_modules')
		await mkdir(nodeModules)
		await writeFile(path.join(nodeModules, 'lib.ts'), '// TODO: should be skipped\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(0)
	})

	it('skips files with non-matching extensions', async () => {
		await writeFile(path.join(tmpDir, 'readme.md'), '<!-- TODO: ignored -->\n')
		const results = await scanTodos(tmpDir, { extensions: ['.ts'] })
		expect(results).toHaveLength(0)
	})

	it('returns empty array when no matches found', async () => {
		await writeFile(path.join(tmpDir, 'clean.ts'), 'const x = 1\n')
		const results = await scanTodos(tmpDir)
		expect(results).toHaveLength(0)
	})
})

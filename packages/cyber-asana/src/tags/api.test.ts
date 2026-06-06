import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	addTagToTask,
	createTag,
	createTagApi,
	deleteTag,
	getTag,
	listTags,
	listTagsForTask,
	listTasksForTag,
	removeTagFromTask,
	updateTag,
} from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockTag = { gid: 'tag1', name: 'Urgent', color: 'red', notes: 'Act fast' }
const mockTask = { gid: 'task1', name: 'Fix bug' }

describe('tags/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTags calls getTagsForWorkspace', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'getTagsForWorkspace').mockResolvedValue({
			data: [mockTag],
		} as never)

		const result = await listTags('ws1')

		expect(result).toEqual({ data: [mockTag], next_page: null, limit: 100 })
		expect(Asana.TagsApi.prototype.getTagsForWorkspace).toHaveBeenCalledWith('ws1', { limit: 100 })
	})

	it('getTag calls getTag with gid', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'getTag').mockResolvedValue({
			data: mockTag,
		} as never)

		const result = await getTag('tag1')

		expect(result).toEqual(mockTag)
		expect(Asana.TagsApi.prototype.getTag).toHaveBeenCalledWith('tag1', {})
	})

	it('createTag forwards name, color, and notes', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'createTagForWorkspace').mockResolvedValue({
			data: mockTag,
		} as never)

		const result = await createTag('ws1', 'Urgent', {
			color: 'red',
			notes: 'Act fast',
		})

		expect(result).toEqual(mockTag)
		expect(Asana.TagsApi.prototype.createTagForWorkspace).toHaveBeenCalledWith(
			{
				data: {
					name: 'Urgent',
					color: 'red',
					notes: 'Act fast',
				},
			},
			'ws1',
		)
	})

	it('updateTag forwards mutable tag fields', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'updateTag').mockResolvedValue({
			data: mockTag,
		} as never)

		const result = await updateTag('tag1', {
			name: 'Urgent',
			color: 'red',
			notes: 'Act fast',
		})

		expect(result).toEqual(mockTag)
		expect(Asana.TagsApi.prototype.updateTag).toHaveBeenCalledWith(
			{
				data: {
					name: 'Urgent',
					color: 'red',
					notes: 'Act fast',
				},
			},
			'tag1',
			{},
		)
	})

	it('deleteTag calls deleteTag with gid', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'deleteTag').mockResolvedValue(undefined as never)

		await deleteTag('tag1')

		expect(Asana.TagsApi.prototype.deleteTag).toHaveBeenCalledWith('tag1')
	})

	it('listTagsForTask calls getTagsForTask', async () => {
		vi.spyOn(Asana.TagsApi.prototype, 'getTagsForTask').mockResolvedValue({
			data: [mockTag],
		} as never)

		const result = await listTagsForTask('task1', { optFields: 'gid,name,color' })

		expect(result).toEqual([mockTag])
		expect(Asana.TagsApi.prototype.getTagsForTask).toHaveBeenCalledWith('task1', {
			limit: 100,
			opt_fields: 'gid,name,color',
		})
	})

	it('listTasksForTag calls getTasksForTag', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'getTasksForTag').mockResolvedValue({
			data: [mockTask],
		} as never)

		const result = await listTasksForTag('tag1', { optFields: 'gid,name,completed' })

		expect(result).toEqual([mockTask])
		expect(Asana.TasksApi.prototype.getTasksForTag).toHaveBeenCalledWith('tag1', {
			limit: 100,
			opt_fields: 'gid,name,completed',
		})
	})

	it('addTagToTask calls addTagForTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'addTagForTask').mockResolvedValue({
			data: mockTask,
		} as never)

		const result = await addTagToTask('task1', 'tag1')

		expect(result).toEqual(mockTask)
		expect(Asana.TasksApi.prototype.addTagForTask).toHaveBeenCalledWith({ data: { tag: 'tag1' } }, 'task1')
	})

	it('removeTagFromTask calls removeTagForTask', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'removeTagForTask').mockResolvedValue({
			data: mockTask,
		} as never)

		const result = await removeTagFromTask('task1', 'tag1')

		expect(result).toEqual(mockTask)
		expect(Asana.TasksApi.prototype.removeTagForTask).toHaveBeenCalledWith({ data: { tag: 'tag1' } }, 'task1')
	})
})

describe('createTagApi', () => {
	it('uses the provided gateway', async () => {
		const listTags = vi.fn().mockResolvedValue({ data: [mockTag], next_page: null, limit: 100 })
		const api = createTagApi({
			listTags,
			getTag: vi.fn(),
			createTag: vi.fn(),
			updateTag: vi.fn(),
			deleteTag: vi.fn(),
			listTagsForTask: vi.fn(),
			listTasksForTag: vi.fn(),
			addTagToTask: vi.fn(),
			removeTagFromTask: vi.fn(),
		})

		const result = await api.listTags('ws1')

		expect(result).toEqual({ data: [mockTag], next_page: null, limit: 100 })
		expect(listTags).toHaveBeenCalledWith('ws1', undefined)
	})
})

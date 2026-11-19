import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaRecordGateway } from './gateway.js'

const client = {} as Asana.ApiClient
const records = Asana.RecordsApi.prototype
const stories = Asana.StoriesApi.prototype

describe('records/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listRecords lists a table with the sort and modified_since filters', async () => {
		const spy = vi.spyOn(records, 'getRecordsForTable').mockResolvedValue({ data: [{ gid: 'r1' }] } as never)

		const result = await createAsanaRecordGateway(client).listRecords(
			't1',
			{ modifiedSince: '2026-11-01T00:00:00Z', sortBy: 'created_at' },
			{ limit: 10, optFields: 'name' },
		)

		expect(spy).toHaveBeenCalledWith('t1', {
			limit: 10,
			opt_fields: 'name',
			modified_since: '2026-11-01T00:00:00Z',
			sort_by: 'created_at',
		})
		expect(result).toEqual({ data: [{ gid: 'r1' }], next_page: null, limit: 10 })
	})

	it('listRecords sends no filter keys when none are given', async () => {
		const spy = vi.spyOn(records, 'getRecordsForTable').mockResolvedValue({ data: [] } as never)

		await createAsanaRecordGateway(client).listRecords('t1')

		expect(spy).toHaveBeenCalledWith('t1', { limit: 100 })
	})

	it('searchRecords maps filters to the dotted query parameters and returns one page', async () => {
		const spy = vi.spyOn(records, 'searchRecordsForWorkspace').mockResolvedValue({ data: [{ gid: 'r1' }] } as never)

		const result = await createAsanaRecordGateway(client).searchRecords(
			'ws1',
			{
				text: 'Renewal',
				tablesAny: ['t1', 't2'],
				tablesNot: ['t3'],
				tablesAll: ['t4'],
				teamsAny: ['tm1'],
				followersAny: ['me'],
				followersNot: ['u2'],
				createdOn: '2026-11-01',
				createdOnBefore: '2026-12-01',
				createdOnAfter: '2026-10-01',
				createdAtBefore: '2026-12-01T00:00:00Z',
				createdAtAfter: '2026-10-01T00:00:00Z',
				sortBy: 'created_at',
				sortAscending: true,
			},
			{ limit: 20, optFields: 'name' },
		)

		expect(spy).toHaveBeenCalledWith('ws1', {
			limit: 20,
			opt_fields: 'name',
			text: 'Renewal',
			'tables.any': 't1,t2',
			'tables.not': 't3',
			'tables.all': 't4',
			'teams.any': 'tm1',
			'followers.any': 'me',
			'followers.not': 'u2',
			created_on: '2026-11-01',
			'created_on.before': '2026-12-01',
			'created_on.after': '2026-10-01',
			'created_at.before': '2026-12-01T00:00:00Z',
			'created_at.after': '2026-10-01T00:00:00Z',
			sort_by: 'created_at',
			sort_ascending: true,
		})
		expect(result).toEqual([{ gid: 'r1' }])
	})

	it('getRecord unwraps data and forwards opt_fields', async () => {
		const spy = vi.spyOn(records, 'getRecord').mockResolvedValue({ data: { gid: 'r1' } } as never)

		expect(await createAsanaRecordGateway(client).getRecord('r1', { optFields: 'custom_fields' })).toEqual({
			gid: 'r1',
		})
		expect(spy).toHaveBeenCalledWith('r1', { opt_fields: 'custom_fields' })
	})

	it('createRecord sends the table as a plain string with fields and the fingerprint', async () => {
		const spy = vi.spyOn(records, 'createRecord').mockResolvedValue({ data: { gid: 'r1' } } as never)

		await createAsanaRecordGateway(client).createRecord('t1', 'Q3 renewal', {
			customFields: { cf1: 'x' },
			uniqueFingerprint: 'fp-1',
		})

		expect(spy).toHaveBeenCalledWith(
			{ data: { name: 'Q3 renewal', table: 't1', custom_fields: { cf1: 'x' }, unique_fingerprint: 'fp-1' } },
			{},
		)
	})

	it('createRecord sends default_access_level', async () => {
		const spy = vi.spyOn(records, 'createRecord').mockResolvedValue({ data: { gid: 'r1' } } as never)

		await createAsanaRecordGateway(client).createRecord('t1', 'Q3', { defaultAccessLevel: 'viewer' })

		expect(spy).toHaveBeenCalledWith({ data: { name: 'Q3', table: 't1', default_access_level: 'viewer' } }, {})
	})

	it('createRecordStory sends is_pinned and sticker_name', async () => {
		const spy = vi.spyOn(stories, 'createStoryForRecord').mockResolvedValue({ data: { gid: 's1' } } as never)

		await createAsanaRecordGateway(client).createRecordStory('r1', {
			text: 'hi',
			is_pinned: true,
			sticker_name: 'heart',
		})

		expect(spy).toHaveBeenCalledWith({ data: { text: 'hi', is_pinned: true, sticker_name: 'heart' } }, 'r1', {})
	})

	it('createRecord omits unset options', async () => {
		const spy = vi.spyOn(records, 'createRecord').mockResolvedValue({ data: { gid: 'r1' } } as never)

		await createAsanaRecordGateway(client).createRecord('t1', 'Q3 renewal')

		expect(spy).toHaveBeenCalledWith({ data: { name: 'Q3 renewal', table: 't1' } }, {})
	})

	it('updateRecord sends only the given fields', async () => {
		const spy = vi.spyOn(records, 'updateRecord').mockResolvedValue({ data: { gid: 'r1' } } as never)

		await createAsanaRecordGateway(client).updateRecord('r1', { custom_fields: { cf1: 'y' } })

		expect(spy).toHaveBeenCalledWith({ data: { custom_fields: { cf1: 'y' } } }, 'r1', {})
	})

	it('deleteRecord deletes by gid', async () => {
		const spy = vi.spyOn(records, 'deleteRecord').mockResolvedValue({ data: {} } as never)

		await createAsanaRecordGateway(client).deleteRecord('r1')

		expect(spy).toHaveBeenCalledWith('r1')
	})

	it('listRecordStories maps the story filters', async () => {
		const spy = vi.spyOn(stories, 'getStoriesForRecord').mockResolvedValue({ data: [{ gid: 's1' }] } as never)

		const result = await createAsanaRecordGateway(client).listRecordStories(
			'r1',
			{ createdAfter: '2026-11-01T00:00:00Z', commentsOnly: true, sortAscending: false },
			{ limit: 5 },
		)

		expect(spy).toHaveBeenCalledWith('r1', {
			limit: 5,
			created_after: '2026-11-01T00:00:00Z',
			resource_subtype: 'comment_added',
			sort_ascending: false,
		})
		expect(result).toEqual({ data: [{ gid: 's1' }], next_page: null, limit: 5 })
	})

	it('createRecordStory posts the comment text', async () => {
		const spy = vi.spyOn(stories, 'createStoryForRecord').mockResolvedValue({ data: { gid: 's1' } } as never)

		await createAsanaRecordGateway(client).createRecordStory('r1', { text: 'hello' })

		expect(spy).toHaveBeenCalledWith({ data: { text: 'hello' } }, 'r1', {})
	})
})

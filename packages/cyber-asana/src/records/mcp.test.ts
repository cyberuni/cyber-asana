import { describe, expect, it, vi } from 'vitest'
import type { RecordApi } from './api.js'
import { registerRecordTools } from './mcp.js'

type Handler = (params: any) => Promise<{ content: { text: string }[] }>

function setup(api: Partial<RecordApi>) {
	const handlers = new Map<string, Handler>()
	registerRecordTools(
		{ tool: (name: string, _d: string, _s: unknown, h: Handler) => handlers.set(name, h) } as never,
		api as RecordApi,
	)
	return handlers
}

describe('records/mcp', () => {
	it('registers the record tools', () => {
		expect([...setup({}).keys()].sort()).toEqual([
			'asana_record_create',
			'asana_record_delete',
			'asana_record_get',
			'asana_record_list',
			'asana_record_search',
			'asana_record_story_create',
			'asana_record_story_list',
			'asana_record_update',
		])
	})

	it('asana_record_list forwards the table, filters and pagination', async () => {
		const listRecords = vi.fn().mockResolvedValue([{ gid: 'r1' }])
		const res = await setup({ listRecords }).get('asana_record_list')!({
			table_gid: 't1',
			sort_by: 'created_at',
			modified_since: '2026-11-01T00:00:00Z',
			limit: 5,
		})

		expect(listRecords).toHaveBeenCalledWith(
			't1',
			{ sortBy: 'created_at', modifiedSince: '2026-11-01T00:00:00Z' },
			expect.objectContaining({ limit: 5 }),
		)
		expect(JSON.parse(res.content[0].text)).toEqual([{ gid: 'r1' }])
	})

	it('asana_record_search maps filters', async () => {
		const searchRecords = vi.fn().mockResolvedValue([])
		await setup({ searchRecords }).get('asana_record_search')!({
			workspace_gid: 'ws1',
			text: 'x',
			tables_any: ['t1'],
			sort_ascending: true,
			limit: 10,
		})

		expect(searchRecords).toHaveBeenCalledWith(
			'ws1',
			{ text: 'x', tablesAny: ['t1'], sortAscending: true },
			expect.objectContaining({ limit: 10 }),
		)
	})

	it('asana_record_create and update forward custom fields', async () => {
		const createRecord = vi.fn().mockResolvedValue({ gid: 'r1' })
		const updateRecord = vi.fn().mockResolvedValue({ gid: 'r1' })
		const h = setup({ createRecord, updateRecord })

		await h.get('asana_record_create')!({
			table_gid: 't1',
			name: 'Q3',
			custom_fields: { cf1: 'a' },
			unique_fingerprint: 'fp',
		})
		await h.get('asana_record_update')!({
			record_gid: 'r1',
			custom_fields: { cf1: 'b' },
			default_access_level: 'editor',
		})

		expect(createRecord).toHaveBeenCalledWith(
			't1',
			'Q3',
			{ customFields: { cf1: 'a' }, uniqueFingerprint: 'fp' },
			undefined,
		)
		expect(updateRecord).toHaveBeenCalledWith(
			'r1',
			{ custom_fields: { cf1: 'b' }, default_access_level: 'editor' },
			undefined,
		)
	})

	it('asana_record_delete is idempotent', async () => {
		const deleteRecord = vi.fn().mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'x' }] } } })
		const res = await setup({ deleteRecord }).get('asana_record_delete')!({ record_gid: 'r1' })

		expect(JSON.parse(res.content[0].text)).toEqual({
			deleted: true,
			resource: 'record',
			gid: 'r1',
			already_absent: true,
		})
	})

	it('story tools forward the record and comment fields', async () => {
		const listRecordStories = vi.fn().mockResolvedValue([])
		const createRecordStory = vi.fn().mockResolvedValue({ gid: 's1' })
		const h = setup({ listRecordStories, createRecordStory })

		await h.get('asana_record_story_list')!({ record_gid: 'r1', comments_only: true, sort_ascending: false })
		await h.get('asana_record_story_create')!({ record_gid: 'r1', text: 'hi' })

		expect(listRecordStories).toHaveBeenCalledWith(
			'r1',
			{ commentsOnly: true, sortAscending: false },
			expect.any(Object),
		)
		expect(createRecordStory).toHaveBeenCalledWith('r1', { text: 'hi' }, undefined)
	})
})

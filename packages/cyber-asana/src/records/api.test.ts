import { describe, expect, it, vi } from 'vitest'
import { createRecordApi } from './api.js'
import type { RecordGateway } from './gateway.js'

function gatewayDouble(): RecordGateway {
	return {
		listRecords: vi.fn(),
		searchRecords: vi.fn(),
		getRecord: vi.fn(),
		createRecord: vi.fn(),
		updateRecord: vi.fn(),
		deleteRecord: vi.fn(),
		listRecordStories: vi.fn(),
		createRecordStory: vi.fn(),
	}
}

describe('createRecordApi story decorations', () => {
	it('createRecordStory passes is_pinned and a known sticker_name to the gateway', async () => {
		const gateway = gatewayDouble()

		await createRecordApi(gateway).createRecordStory('r1', { text: 'hi', is_pinned: true, sticker_name: 'trophy' })

		expect(gateway.createRecordStory).toHaveBeenCalledWith(
			'r1',
			{ text: 'hi', is_pinned: true, sticker_name: 'trophy' },
			undefined,
		)
	})

	it('createRecordStory rejects an unknown sticker_name before calling the gateway', async () => {
		const gateway = gatewayDouble()

		await expect(
			createRecordApi(gateway).createRecordStory('r1', { text: 'hi', sticker_name: 'nope' }),
		).rejects.toThrow(/sticker_name must be one of/)
		expect(gateway.createRecordStory).not.toHaveBeenCalled()
	})
})

describe('createRecordApi', () => {
	it('delegates every operation to the gateway', async () => {
		const gateway = gatewayDouble()
		const api = createRecordApi(gateway)

		await api.listRecords('t1', { sortBy: 'created_at' }, { limit: 3 })
		await api.searchRecords('ws1', { text: 'x' }, { limit: 2 })
		await api.getRecord('r1', { optFields: 'name' })
		await api.createRecord('t1', 'Q3', { uniqueFingerprint: 'fp' })
		await api.updateRecord('r1', { name: 'N' })
		await api.deleteRecord('r1')
		await api.listRecordStories('r1', { commentsOnly: true }, { limit: 1 })
		await api.createRecordStory('r1', { text: 'hi' })

		expect(gateway.listRecords).toHaveBeenCalledWith('t1', { sortBy: 'created_at' }, { limit: 3 })
		expect(gateway.searchRecords).toHaveBeenCalledWith('ws1', { text: 'x' }, { limit: 2 })
		expect(gateway.getRecord).toHaveBeenCalledWith('r1', { optFields: 'name' })
		expect(gateway.createRecord).toHaveBeenCalledWith('t1', 'Q3', { uniqueFingerprint: 'fp' }, undefined)
		expect(gateway.updateRecord).toHaveBeenCalledWith('r1', { name: 'N' }, undefined)
		expect(gateway.deleteRecord).toHaveBeenCalledWith('r1')
		expect(gateway.listRecordStories).toHaveBeenCalledWith('r1', { commentsOnly: true }, { limit: 1 })
		expect(gateway.createRecordStory).toHaveBeenCalledWith('r1', { text: 'hi' }, undefined)
	})
})

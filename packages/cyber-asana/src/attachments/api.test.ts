import { describe, expect, it, vi } from 'vitest'
import { createAttachmentApi } from './api.js'

const mockAttachment = { gid: 'att1', name: 'screenshot.png', resource_type: 'attachment' }

describe('createAttachmentApi', () => {
	it('uses the provided gateway for listAttachments', async () => {
		const mockListAttachments = vi.fn().mockResolvedValue({ data: [mockAttachment], next_page: null, limit: 100 })
		const api = createAttachmentApi({
			listAttachments: mockListAttachments,
			getAttachment: vi.fn(),
			createAttachment: vi.fn(),
			deleteAttachment: vi.fn(),
		})

		const result = await api.listAttachments('task1')

		expect(result).toEqual({ data: [mockAttachment], next_page: null, limit: 100 })
		expect(mockListAttachments).toHaveBeenCalledWith('task1', undefined)
	})

	it('passes connectToApp through to the gateway for a url attachment', async () => {
		const createAttachment = vi.fn().mockResolvedValue(mockAttachment)
		const api = createAttachmentApi({
			listAttachments: vi.fn(),
			getAttachment: vi.fn(),
			createAttachment,
			deleteAttachment: vi.fn(),
		})

		await api.createAttachment('task1', { url: 'https://example.com/design', connectToApp: true })

		expect(createAttachment).toHaveBeenCalledWith(
			{
				parent: 'task1',
				url: 'https://example.com/design',
				name: 'https://example.com/design',
				resourceSubtype: 'external',
				connectToApp: true,
			},
			undefined,
		)
	})
})

import { describe, expect, it, vi } from 'vitest'
import { createAttachmentApi } from './api.js'

const mockAttachment = { gid: 'att1', name: 'screenshot.png', resource_type: 'attachment' }

describe('createAttachmentApi', () => {
	it('uses the provided gateway for listAttachments', async () => {
		const mockListAttachments = vi.fn().mockResolvedValue({ data: [mockAttachment], next_page: null, limit: 100 })
		const api = createAttachmentApi({
			listAttachments: mockListAttachments,
			getAttachment: vi.fn(),
		})

		const result = await api.listAttachments('task1')

		expect(result).toEqual({ data: [mockAttachment], next_page: null, limit: 100 })
		expect(mockListAttachments).toHaveBeenCalledWith('task1', undefined)
	})
})

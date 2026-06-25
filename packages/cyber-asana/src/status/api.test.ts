import { describe, expect, it, vi } from 'vitest'
import { createStatusApi } from './api.js'

const mockStatus = { gid: 'st1', status_type: 'on_track', text: 'All good' }

describe('createStatusApi', () => {
	it('uses the provided gateway for listStatuses', async () => {
		const mockListStatuses = vi.fn().mockResolvedValue({ data: [mockStatus], next_page: null, limit: 100 })
		const api = createStatusApi({
			listStatuses: mockListStatuses,
			getStatus: vi.fn(),
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
		})

		const result = await api.listStatuses('proj1', { limit: 25 })

		expect(result).toEqual({ data: [mockStatus], next_page: null, limit: 100 })
		expect(mockListStatuses).toHaveBeenCalledWith('proj1', { limit: 25 })
	})

	it('uses the provided gateway for createStatus', async () => {
		const mockCreateStatus = vi.fn().mockResolvedValue(mockStatus)
		const api = createStatusApi({
			listStatuses: vi.fn(),
			getStatus: vi.fn(),
			createStatus: mockCreateStatus,
			deleteStatus: vi.fn(),
		})

		const result = await api.createStatus('proj1', { status_type: 'on_track', text: 'All good' })

		expect(result).toEqual(mockStatus)
		expect(mockCreateStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})
})

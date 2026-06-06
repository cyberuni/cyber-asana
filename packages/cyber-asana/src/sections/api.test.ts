import { describe, expect, it, vi } from 'vitest'
import { createSectionApi } from './api.js'

const mockSection = { gid: 'sec1', name: 'In Progress' }

describe('createSectionApi', () => {
	it('uses the provided gateway for listSections', async () => {
		const mockListSections = vi.fn().mockResolvedValue({ data: [mockSection], next_page: null, limit: 100 })
		const api = createSectionApi({
			listSections: mockListSections,
			getSection: vi.fn(),
			createSection: vi.fn(),
			updateSection: vi.fn(),
			deleteSection: vi.fn(),
		})

		const result = await api.listSections('proj1')

		expect(result).toEqual({ data: [mockSection], next_page: null, limit: 100 })
		expect(mockListSections).toHaveBeenCalledWith('proj1', undefined)
	})
})

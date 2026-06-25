import { describe, expect, it, vi } from 'vitest'
import { createPortfolioApi } from './api.js'

const mockPortfolio = { gid: 'pf1', name: 'Q1 Goals' }

describe('createPortfolioApi', () => {
	it('uses the provided gateway for listPortfolios', async () => {
		const mockListPortfolios = vi.fn().mockResolvedValue({ data: [mockPortfolio], next_page: null, limit: 100 })
		const api = createPortfolioApi({
			listPortfolios: mockListPortfolios,
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		const result = await api.listPortfolios('ws1')

		expect(result).toEqual({ data: [mockPortfolio], next_page: null, limit: 100 })
		expect(mockListPortfolios).toHaveBeenCalledWith('ws1', undefined)
	})

	it('uses the provided gateway for listPortfolioItems', async () => {
		const mockItem = { gid: 'proj1', name: 'Website' }
		const mockListPortfolioItems = vi.fn().mockResolvedValue({ data: [mockItem], next_page: null, limit: 100 })
		const api = createPortfolioApi({
			listPortfolios: vi.fn(),
			listPortfolioItems: mockListPortfolioItems,
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		const result = await api.listPortfolioItems('pf1', { limit: 25 })

		expect(result).toEqual({ data: [mockItem], next_page: null, limit: 100 })
		expect(mockListPortfolioItems).toHaveBeenCalledWith('pf1', { limit: 25 })
	})
})

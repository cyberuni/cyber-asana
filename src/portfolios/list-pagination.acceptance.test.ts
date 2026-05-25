import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createPortfolioApi } from './api.js'
import type { PortfolioGateway } from './gateway.js'
import { definePortfolioListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'
const pages = [[{ gid: 'pf1', name: 'Roadmap' }], [{ gid: 'pf2', name: 'Clients' }], [{ gid: 'pf3', name: 'Internal' }]]

function createPaginatingPortfolioGateway(): PortfolioGateway {
	return {
		listPortfolios: createPaginatingScopedListMock(pages),
		getPortfolio: vi.fn(),
		createPortfolio: vi.fn(),
		updatePortfolio: vi.fn(),
		deletePortfolio: vi.fn(),
	}
}

describe(
	'portfolios/list pagination acceptance',
	definePortfolioListPaginationAcceptanceSpecs({
		getApi: () => createPortfolioApi(createPaginatingPortfolioGateway()),
		workspaceGid,
	}),
)

describe('portfolios/list pagination acceptance gateway double', () => {
	it('exercises listPortfolios without importing the Asana SDK', async () => {
		const gateway = createPaginatingPortfolioGateway()
		const api = createPortfolioApi(gateway)

		const result = await api.listPortfolios(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'pf1', name: 'Roadmap' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listPortfolios).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})

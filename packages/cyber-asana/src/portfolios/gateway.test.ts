import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaPortfolioGateway } from './gateway.js'

describe('portfolios/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listPortfolios forwards owner and customType to getPortfolios', async () => {
		vi.spyOn(Asana.PortfoliosApi.prototype, 'getPortfolios').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaPortfolioGateway({} as Asana.ApiClient)

		await gateway.listPortfolios('ws1', { owner: 'u1', customType: 'ct1' })

		expect(Asana.PortfoliosApi.prototype.getPortfolios).toHaveBeenCalledWith('ws1', {
			owner: 'u1',
			custom_type: 'ct1',
			limit: 100,
		})
	})

	it('listPortfolios forwards an empty customType, which selects portfolios with no custom type', async () => {
		vi.spyOn(Asana.PortfoliosApi.prototype, 'getPortfolios').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaPortfolioGateway({} as Asana.ApiClient)

		await gateway.listPortfolios('ws1', { customType: '' })

		expect(Asana.PortfoliosApi.prototype.getPortfolios).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ custom_type: '' }),
		)
	})

	it('listPortfolios omits custom_type when no customType is given', async () => {
		vi.spyOn(Asana.PortfoliosApi.prototype, 'getPortfolios').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaPortfolioGateway({} as Asana.ApiClient)

		await gateway.listPortfolios('ws1')

		expect(vi.mocked(Asana.PortfoliosApi.prototype.getPortfolios).mock.calls[0][1]).not.toHaveProperty('custom_type')
	})
})

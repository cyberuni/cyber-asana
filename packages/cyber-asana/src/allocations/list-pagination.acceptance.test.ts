import { describe, expect, it, vi } from 'vitest'
import { paginatingListResult } from '../testing/paginating-gateway.js'
import { createAllocationApi } from './api.js'
import type { AllocationGateway } from './gateway.js'
import { defineAllocationListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const pages = [[{ gid: 'al1' }], [{ gid: 'al2' }], [{ gid: 'al3' }]]

function createPaginatingGateway(): AllocationGateway {
	return {
		listAllocations: vi.fn(async (opts) => paginatingListResult(pages, opts)),
		getAllocation: vi.fn(),
		createAllocation: vi.fn(),
		updateAllocation: vi.fn(),
		deleteAllocation: vi.fn(),
	}
}

describe(
	'allocations/list pagination acceptance',
	defineAllocationListPaginationAcceptanceSpecs({
		getApi: () => createAllocationApi(createPaginatingGateway()),
		filters: { parent: 'p1' },
	}),
)

describe('allocations/list pagination acceptance gateway double', () => {
	it('keeps the filters beside the paging options', async () => {
		const gateway = createPaginatingGateway()
		const result = await createAllocationApi(gateway).listAllocations({ parent: 'p1', limit: 25 })

		expect(result).toEqual({ data: pages[0], next_page: { offset: 'page2' }, limit: 25 })
		expect(gateway.listAllocations).toHaveBeenCalledWith({ parent: 'p1', limit: 25 })
	})
})

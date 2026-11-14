import { describe, expect, it, vi } from 'vitest'
import { createAllocationApi } from './api.js'
import type { AllocationGateway } from './gateway.js'

function gatewayStub(): AllocationGateway {
	return {
		listAllocations: vi.fn(),
		getAllocation: vi.fn(),
		createAllocation: vi.fn(),
		updateAllocation: vi.fn(),
		deleteAllocation: vi.fn(),
	}
}

describe('allocations/api', () => {
	it('delegates every operation to the gateway unchanged', async () => {
		const gateway = gatewayStub()
		vi.mocked(gateway.listAllocations).mockResolvedValue([])
		vi.mocked(gateway.getAllocation).mockResolvedValue({ gid: 'a1' })
		vi.mocked(gateway.createAllocation).mockResolvedValue({ gid: 'a2' })
		vi.mocked(gateway.updateAllocation).mockResolvedValue({ gid: 'a1' })
		const api = createAllocationApi(gateway)
		const fields = {
			assignee: 'u1',
			parent: 'p1',
			start_date: '2026-01-05',
			end_date: '2026-01-18',
			effort: { type: 'hours' as const, value: 20 },
		}

		await api.listAllocations({ parent: 'p1', assignee: 'u1', workspace: 'w1', limit: 10 })
		await api.getAllocation('a1', { optFields: 'gid' })
		await api.createAllocation(fields)
		await api.updateAllocation('a1', { end_date: '2026-01-25' })
		await api.deleteAllocation('a1')

		expect(gateway.listAllocations).toHaveBeenCalledWith({ parent: 'p1', assignee: 'u1', workspace: 'w1', limit: 10 })
		expect(gateway.getAllocation).toHaveBeenCalledWith('a1', { optFields: 'gid' })
		expect(gateway.createAllocation).toHaveBeenCalledWith(fields)
		expect(gateway.updateAllocation).toHaveBeenCalledWith('a1', { end_date: '2026-01-25' })
		expect(gateway.deleteAllocation).toHaveBeenCalledWith('a1')
	})
})

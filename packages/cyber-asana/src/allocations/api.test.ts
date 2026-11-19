import { describe, expect, it, vi } from 'vitest'
import type { UserGateway } from '../users/gateway.js'
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

function usersStub(gid = 'u-me'): Pick<UserGateway, 'getMe'> {
	return { getMe: vi.fn(async () => ({ gid }) as never) }
}

describe('allocations/api', () => {
	it('delegates every operation to the gateway unchanged', async () => {
		const gateway = gatewayStub()
		vi.mocked(gateway.listAllocations).mockResolvedValue([])
		vi.mocked(gateway.getAllocation).mockResolvedValue({ gid: 'a1' })
		vi.mocked(gateway.createAllocation).mockResolvedValue({ gid: 'a2' })
		vi.mocked(gateway.updateAllocation).mockResolvedValue({ gid: 'a1' })
		const api = createAllocationApi(gateway, { users: usersStub() })
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
		expect(gateway.createAllocation).toHaveBeenCalledWith(fields, undefined)
		expect(gateway.updateAllocation).toHaveBeenCalledWith('a1', { end_date: '2026-01-25' }, undefined)
		expect(gateway.deleteAllocation).toHaveBeenCalledWith('a1')
	})

	describe('assignee me', () => {
		const fields = { assignee: 'me', parent: 'p1', start_date: '2026-01-05', end_date: '2026-01-18' }

		it('resolves me to the caller GID before listing', async () => {
			const gateway = gatewayStub()
			const users = usersStub()
			await createAllocationApi(gateway, { users }).listAllocations({ assignee: 'me', workspace: 'w1' })

			expect(users.getMe).toHaveBeenCalledTimes(1)
			expect(users.getMe).toHaveBeenCalledWith({ optFields: 'gid' })
			expect(gateway.listAllocations).toHaveBeenCalledWith({ assignee: 'u-me', workspace: 'w1' })
		})

		it('resolves me before creating', async () => {
			const gateway = gatewayStub()
			await createAllocationApi(gateway, { users: usersStub() }).createAllocation(fields)

			expect(gateway.createAllocation).toHaveBeenCalledWith({ ...fields, assignee: 'u-me' }, undefined)
		})

		it('passes a real GID through without a lookup', async () => {
			const gateway = gatewayStub()
			const users = usersStub()
			const api = createAllocationApi(gateway, { users })
			await api.listAllocations({ assignee: '123' })
			await api.createAllocation({ ...fields, assignee: '123' })

			expect(users.getMe).not.toHaveBeenCalled()
			expect(gateway.listAllocations).toHaveBeenCalledWith({ assignee: '123' })
		})

		it('does not look up the caller when no assignee is given', async () => {
			const users = usersStub()
			await createAllocationApi(gatewayStub(), { users }).listAllocations({ parent: 'p1' })

			expect(users.getMe).not.toHaveBeenCalled()
		})
	})
})

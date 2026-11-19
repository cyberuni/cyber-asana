import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaAllocationGateway } from './gateway.js'

describe('allocations/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('update sends assignee and parent under Asana’s names', async () => {
		const spy = vi
			.spyOn(Asana.AllocationsApi.prototype, 'updateAllocation')
			.mockResolvedValue({ data: { gid: 'a1' } } as never)

		await createAsanaAllocationGateway({} as Asana.ApiClient).updateAllocation('a1', { assignee: 'u2', parent: 'p2' })

		expect(spy).toHaveBeenCalledWith({ data: { assignee: 'u2', parent: 'p2' } }, 'a1', {})
	})
})

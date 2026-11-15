import { describe, expect, it, vi } from 'vitest'
import { resolveAssignee } from './gateway.js'

describe('allocations/gateway resolveAssignee', () => {
	it('swaps me for the caller GID, because Asana does not take me as an allocation assignee', async () => {
		const getMe = vi.fn().mockResolvedValue('u9')
		expect(await resolveAssignee('me', getMe)).toBe('u9')
		expect(getMe).toHaveBeenCalledOnce()
	})

	it('passes a GID, and an absent assignee, through without a lookup', async () => {
		const getMe = vi.fn()
		expect(await resolveAssignee('u1', getMe)).toBe('u1')
		expect(await resolveAssignee(undefined, getMe)).toBeUndefined()
		expect(getMe).not.toHaveBeenCalled()
	})
})

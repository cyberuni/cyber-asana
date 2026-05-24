import { describe, expect, it, vi } from 'vitest'
import { createUserApi } from './api.js'

const mockUser = { gid: 'user1', name: 'Alice', email: 'alice@example.com' }

describe('createUserApi', () => {
	it('uses the provided gateway for listUsers', async () => {
		const mockListUsers = vi.fn().mockResolvedValue({ data: [mockUser], next_page: null })
		const api = createUserApi({
			listUsers: mockListUsers,
			getUser: vi.fn(),
			getMe: vi.fn(),
		})

		const result = await api.listUsers('ws1')

		expect(result).toEqual({ data: [mockUser], next_page: null })
		expect(mockListUsers).toHaveBeenCalledWith('ws1', undefined)
	})
})

import { describe, expect, it, vi } from 'vitest'
import { createGoalApi } from './api.js'

const mockGoal = { gid: 'goal1', name: 'Launch v2' }

describe('createGoalApi', () => {
	it('uses the provided gateway for listGoals', async () => {
		const mockListGoals = vi.fn().mockResolvedValue({ data: [mockGoal], next_page: null, limit: 100 })
		const api = createGoalApi({
			listGoals: mockListGoals,
			getGoal: vi.fn(),
			createGoal: vi.fn(),
			updateGoal: vi.fn(),
			deleteGoal: vi.fn(),
		})

		const result = await api.listGoals('ws1')

		expect(result).toEqual({ data: [mockGoal], next_page: null, limit: 100 })
		expect(mockListGoals).toHaveBeenCalledWith('ws1', undefined)
	})
})

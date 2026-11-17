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
			listTimePeriods: vi.fn(),
			setGoalMetric: vi.fn(),
			setGoalMetricCurrentValue: vi.fn(),
			addSupportingRelationship: vi.fn(),
			removeSupportingRelationship: vi.fn(),
		})

		const result = await api.listGoals('ws1')

		expect(result).toEqual({ data: [mockGoal], next_page: null, limit: 100 })
		expect(mockListGoals).toHaveBeenCalledWith('ws1', undefined)
	})

	it('uses the provided gateway for listTimePeriods', async () => {
		const periods = { data: [{ gid: 'tp1' }], next_page: null, limit: 1 }
		const listTimePeriods = vi.fn().mockResolvedValue(periods)
		const api = createGoalApi({
			listGoals: vi.fn(),
			getGoal: vi.fn(),
			createGoal: vi.fn(),
			updateGoal: vi.fn(),
			deleteGoal: vi.fn(),
			listTimePeriods,
			setGoalMetric: vi.fn(),
			setGoalMetricCurrentValue: vi.fn(),
			addSupportingRelationship: vi.fn(),
			removeSupportingRelationship: vi.fn(),
		})

		expect(await api.listTimePeriods('ws1', { limit: 1 })).toEqual(periods)
		expect(listTimePeriods).toHaveBeenCalledWith('ws1', { limit: 1 })
	})
})

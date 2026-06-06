import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createGoalApi } from './api.js'
import type { GoalGateway } from './gateway.js'
import { defineGoalListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'
const pages = [[{ gid: 'goal1', name: 'Q1' }], [{ gid: 'goal2', name: 'Q2' }], [{ gid: 'goal3', name: 'Q3' }]]

function createPaginatingGoalGateway(): GoalGateway {
	return {
		listGoals: createPaginatingScopedListMock(pages),
		getGoal: vi.fn(),
		createGoal: vi.fn(),
		updateGoal: vi.fn(),
		deleteGoal: vi.fn(),
	}
}

describe(
	'goals/list pagination acceptance',
	defineGoalListPaginationAcceptanceSpecs({
		getApi: () => createGoalApi(createPaginatingGoalGateway()),
		workspaceGid,
	}),
)

describe('goals/list pagination acceptance gateway double', () => {
	it('exercises listGoals without importing the Asana SDK', async () => {
		const gateway = createPaginatingGoalGateway()
		const api = createGoalApi(gateway)

		const result = await api.listGoals(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'goal1', name: 'Q1' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listGoals).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})

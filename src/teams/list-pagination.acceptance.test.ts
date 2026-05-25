import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createTeamApi } from './api.js'
import type { TeamGateway } from './gateway.js'
import { defineTeamListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'
const pages = [[{ gid: 'team1', name: 'Core' }], [{ gid: 'team2', name: 'Ops' }], [{ gid: 'team3', name: 'Design' }]]

function createPaginatingTeamGateway(): TeamGateway {
	return {
		listTeams: createPaginatingScopedListMock(pages),
		getTeam: vi.fn(),
	}
}

describe(
	'teams/list pagination acceptance',
	defineTeamListPaginationAcceptanceSpecs({
		getApi: () => createTeamApi(createPaginatingTeamGateway()),
		workspaceGid,
	}),
)

describe('teams/list pagination acceptance gateway double', () => {
	it('exercises listTeams without importing the Asana SDK', async () => {
		const gateway = createPaginatingTeamGateway()
		const api = createTeamApi(gateway)

		const result = await api.listTeams(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'team1', name: 'Core' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listTeams).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})

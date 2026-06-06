import { describe, expect, it, vi } from 'vitest'
import { createTeamApi } from './api.js'

const mockTeam = { gid: 'team1', name: 'Engineering' }

describe('createTeamApi', () => {
	it('uses the provided gateway for listTeams', async () => {
		const mockListTeams = vi.fn().mockResolvedValue({ data: [mockTeam], next_page: null, limit: 100 })
		const api = createTeamApi({
			listTeams: mockListTeams,
			getTeam: vi.fn(),
		})

		const result = await api.listTeams('ws1')

		expect(result).toEqual({ data: [mockTeam], next_page: null, limit: 100 })
		expect(mockListTeams).toHaveBeenCalledWith('ws1', undefined)
	})
})

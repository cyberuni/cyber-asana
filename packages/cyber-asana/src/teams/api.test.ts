import { describe, expect, it, vi } from 'vitest'
import { createTeamApi } from './api.js'

const mockTeam = { gid: 'team1', name: 'Engineering' }

describe('createTeamApi', () => {
	it('uses the provided gateway for listTeams', async () => {
		const mockListTeams = vi.fn().mockResolvedValue({ data: [mockTeam], next_page: null, limit: 100 })
		const api = createTeamApi({
			listTeams: mockListTeams,
			getTeam: vi.fn(),
			listTeamMembers: vi.fn(),
			listTeamProjects: vi.fn(),
		})

		const result = await api.listTeams('ws1')

		expect(result).toEqual({ data: [mockTeam], next_page: null, limit: 100 })
		expect(mockListTeams).toHaveBeenCalledWith('ws1', undefined)
	})

	it("lists a team's members and projects through the gateway", async () => {
		const listTeamMembers = vi.fn().mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const listTeamProjects = vi.fn().mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const api = createTeamApi({ listTeams: vi.fn(), getTeam: vi.fn(), listTeamMembers, listTeamProjects })

		await api.listTeamMembers('team1', { limit: 5 })
		await api.listTeamProjects('team1', { archived: false })

		expect(listTeamMembers).toHaveBeenCalledWith('team1', { limit: 5 })
		expect(listTeamProjects).toHaveBeenCalledWith('team1', { archived: false })
	})
})

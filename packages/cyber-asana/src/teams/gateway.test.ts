import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaTeamGateway } from './gateway.js'

describe('teams/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTeamMembers reads the team memberships of the team', async () => {
		vi.spyOn(Asana.TeamMembershipsApi.prototype, 'getTeamMembershipsForTeam').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaTeamGateway({} as Asana.ApiClient)

		await gateway.listTeamMembers('t1', { limit: 20, optFields: 'user.gid' })

		expect(Asana.TeamMembershipsApi.prototype.getTeamMembershipsForTeam).toHaveBeenCalledWith('t1', {
			limit: 20,
			opt_fields: 'user.gid',
		})
	})

	it('listTeamProjects forwards archived only when it is given', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'getProjectsForTeam').mockResolvedValue({ data: [] } as never)
		const gateway = createAsanaTeamGateway({} as Asana.ApiClient)

		await gateway.listTeamProjects('t1', { archived: false })
		await gateway.listTeamProjects('t1')

		const calls = vi.mocked(Asana.ProjectsApi.prototype.getProjectsForTeam).mock.calls
		expect(calls[0]).toEqual(['t1', expect.objectContaining({ archived: false })])
		expect(calls[1]?.[1]).not.toHaveProperty('archived')
	})
})

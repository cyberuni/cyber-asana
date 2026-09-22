import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaUserGateway } from './gateway.js'

describe('users/gateway listUsers', () => {
	afterEach(() => vi.restoreAllMocks())

	// GET /workspaces/{gid}/users cannot paginate and fails with 400 on large workspaces;
	// Asana's own error message says to page GET /users?workspace= instead (issue #185).
	it('pages GET /users filtered by workspace instead of the unpaginated workspace endpoint', async () => {
		const getUsers = vi
			.spyOn(Asana.UsersApi.prototype, 'getUsers')
			.mockResolvedValue({ data: [{ gid: '1' }], _response: { next_page: null } } as never)
		const getUsersForWorkspace = vi.spyOn(Asana.UsersApi.prototype, 'getUsersForWorkspace')
		const gateway = createAsanaUserGateway({} as Asana.ApiClient)

		await gateway.listUsers('ws1', { limit: 50, offset: 'tok', optFields: 'gid,name' })

		expect(getUsers).toHaveBeenCalledWith({ workspace: 'ws1', limit: 50, offset: 'tok', opt_fields: 'gid,name' })
		expect(getUsersForWorkspace).not.toHaveBeenCalled()
	})

	it('follows next pages with fetchAll', async () => {
		const secondPage = { data: [{ gid: '2' }], _response: { next_page: null } }
		vi.spyOn(Asana.UsersApi.prototype, 'getUsers').mockResolvedValue({
			data: [{ gid: '1' }],
			_response: { next_page: { offset: 'tok' } },
			nextPage: async () => secondPage,
		} as never)
		const gateway = createAsanaUserGateway({} as Asana.ApiClient)

		const result = await gateway.listUsers('ws1', { fetchAll: true })

		expect(result).toMatchObject({ data: [{ gid: '1' }, { gid: '2' }], page_count: 2, truncated: false })
	})
})

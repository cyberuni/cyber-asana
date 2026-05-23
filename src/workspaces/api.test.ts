import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWorkspace, listWorkspaces } from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockWs = { gid: 'ws1', name: 'My Workspace' }

describe('workspaces/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listWorkspaces calls getWorkspaces', async () => {
		vi.spyOn(Asana.WorkspacesApi.prototype, 'getWorkspaces').mockResolvedValue({
			data: [mockWs],
		} as never)
		const result = await listWorkspaces()
		expect(result).toEqual({ data: [mockWs], next_page: null, limit: 100 })
		expect(Asana.WorkspacesApi.prototype.getWorkspaces).toHaveBeenCalledWith({ limit: 100 })
	})

	it('getWorkspace calls getWorkspace with gid', async () => {
		vi.spyOn(Asana.WorkspacesApi.prototype, 'getWorkspace').mockResolvedValue({
			data: mockWs,
		} as never)
		const result = await getWorkspace('ws1')
		expect(result).toEqual(mockWs)
	})
})

import { describe, expect, it, vi } from 'vitest'
import { createWorkspaceApi } from './api.js'
import type { WorkspaceGateway } from './gateway.js'
import { defineWorkspaceListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

function createPaginatingWorkspaceGateway(): WorkspaceGateway {
	const pageOne = [{ gid: 'ws1', name: 'Acme' }]
	const pageTwo = [{ gid: 'ws2', name: 'Beta' }]
	const pageThree = [{ gid: 'ws3', name: 'Gamma' }]

	return {
		listWorkspaces: vi.fn(async (opts) => {
			if (opts?.fetchAll) {
				const maxPages = opts.maxPages ?? 10
				const pages = [pageOne, pageTwo, pageThree].slice(0, maxPages)
				return {
					data: pages.flat(),
					next_page: maxPages < 3 ? { offset: 'page3' } : null,
					limit: opts.limit ?? 100,
					page_count: pages.length,
					truncated: maxPages < 3,
				}
			}

			if (opts?.offset === 'page2') {
				return {
					data: pageTwo,
					next_page: { offset: 'page3' },
					limit: opts.limit ?? 100,
				}
			}

			return {
				data: pageOne,
				next_page: { offset: 'page2' },
				limit: opts?.limit ?? 100,
			}
		}),
		getWorkspace: vi.fn(),
	}
}

describe(
	'workspaces/list pagination acceptance',
	defineWorkspaceListPaginationAcceptanceSpecs({
		getApi: () => createWorkspaceApi(createPaginatingWorkspaceGateway()),
	}),
)

describe('workspaces/list pagination acceptance gateway double', () => {
	it('exercises listWorkspaces without importing the Asana SDK', async () => {
		const gateway = createPaginatingWorkspaceGateway()
		const api = createWorkspaceApi(gateway)

		const result = await api.listWorkspaces({ limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'ws1', name: 'Acme' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listWorkspaces).toHaveBeenCalledWith({ limit: 25 })
	})
})

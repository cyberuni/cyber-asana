import { describe, expect, it, vi } from 'vitest'
import { createProjectApi } from './api.js'
import type { ProjectGateway } from './gateway.js'
import { defineProjectListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'

function createPaginatingProjectGateway(): ProjectGateway {
	const pageOne = [{ gid: 'proj1', name: 'Alpha' }]
	const pageTwo = [{ gid: 'proj2', name: 'Beta' }]
	const pageThree = [{ gid: 'proj3', name: 'Gamma' }]

	return {
		listProjects: vi.fn(async (_workspaceGid, opts) => {
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
		getProject: vi.fn(),
		getProjectTaskCounts: vi.fn(),
		createProject: vi.fn(),
		updateProject: vi.fn(),
		deleteProject: vi.fn(),
		searchProjects: vi.fn(),
		listSections: vi.fn(),
		listTasksForSection: vi.fn(),
	}
}

describe(
	'projects/list pagination acceptance',
	defineProjectListPaginationAcceptanceSpecs({
		getApi: () => createProjectApi(createPaginatingProjectGateway()),
		workspaceGid,
	}),
)

describe('projects/list pagination acceptance gateway double', () => {
	it('exercises listProjects without importing the Asana SDK', async () => {
		const gateway = createPaginatingProjectGateway()
		const api = createProjectApi(gateway)

		const result = await api.listProjects(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'proj1', name: 'Alpha' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listProjects).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})

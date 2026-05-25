import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createSectionApi } from './api.js'
import type { SectionGateway } from './gateway.js'
import { defineSectionListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const projectGid = 'proj-test'
const pages = [[{ gid: 'sec1', name: 'Todo' }], [{ gid: 'sec2', name: 'Doing' }], [{ gid: 'sec3', name: 'Done' }]]

function createPaginatingSectionGateway(): SectionGateway {
	return {
		listSections: createPaginatingScopedListMock(pages),
		getSection: vi.fn(),
		createSection: vi.fn(),
		updateSection: vi.fn(),
		deleteSection: vi.fn(),
	}
}

describe(
	'sections/list pagination acceptance',
	defineSectionListPaginationAcceptanceSpecs({
		getApi: () => createSectionApi(createPaginatingSectionGateway()),
		projectGid,
	}),
)

describe('sections/list pagination acceptance gateway double', () => {
	it('exercises listSections without importing the Asana SDK', async () => {
		const gateway = createPaginatingSectionGateway()
		const api = createSectionApi(gateway)

		const result = await api.listSections(projectGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'sec1', name: 'Todo' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listSections).toHaveBeenCalledWith(projectGid, { limit: 25 })
	})
})

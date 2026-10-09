import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { SectionGateway, SectionPlacement, TaskPlacement } from './gateway.js'

export type SectionApi = ReturnType<typeof createSectionApi>

export function createSectionApi(gateway: SectionGateway) {
	return {
		listSections(projectGid: string, opts?: PaginationOptions) {
			return gateway.listSections(projectGid, opts)
		},
		getSection(sectionGid: string, opts?: ReadOptions) {
			return gateway.getSection(sectionGid, opts)
		},
		createSection(projectGid: string, name: string, opts?: SectionPlacement) {
			return gateway.createSection(projectGid, name, opts)
		},
		updateSection(sectionGid: string, name: string) {
			return gateway.updateSection(sectionGid, name)
		},
		deleteSection(sectionGid: string) {
			return gateway.deleteSection(sectionGid)
		},
		moveSection(projectGid: string, sectionGid: string, opts?: SectionPlacement) {
			return gateway.moveSection(projectGid, sectionGid, opts)
		},
		addTaskToSection(sectionGid: string, taskGid: string, opts?: TaskPlacement) {
			return gateway.addTaskToSection(sectionGid, taskGid, opts)
		},
	}
}

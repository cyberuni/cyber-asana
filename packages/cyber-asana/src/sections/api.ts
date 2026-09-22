import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { createAsanaSectionGateway, type SectionGateway, type SectionPlacement, type TaskPlacement } from './gateway.js'

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

function defaultSectionApi() {
	return createSectionApi(createAsanaSectionGateway(createClient()))
}

export async function listSections(projectGid: string, opts?: PaginationOptions) {
	return defaultSectionApi().listSections(projectGid, opts)
}

export async function getSection(sectionGid: string, opts?: ReadOptions) {
	return defaultSectionApi().getSection(sectionGid, opts)
}

export async function createSection(projectGid: string, name: string, opts?: SectionPlacement) {
	return defaultSectionApi().createSection(projectGid, name, opts)
}

export async function updateSection(sectionGid: string, name: string) {
	return defaultSectionApi().updateSection(sectionGid, name)
}

export async function deleteSection(sectionGid: string) {
	return defaultSectionApi().deleteSection(sectionGid)
}

export async function moveSection(projectGid: string, sectionGid: string, opts?: SectionPlacement) {
	return defaultSectionApi().moveSection(projectGid, sectionGid, opts)
}

export async function addTaskToSection(sectionGid: string, taskGid: string, opts?: TaskPlacement) {
	return defaultSectionApi().addTaskToSection(sectionGid, taskGid, opts)
}

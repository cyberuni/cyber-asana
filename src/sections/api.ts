import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaSectionGateway, type SectionGateway } from './gateway.js'

export type SectionApi = ReturnType<typeof createSectionApi>

export function createSectionApi(gateway: SectionGateway) {
	return {
		listSections(projectGid: string, opts?: PaginationOptions) {
			return gateway.listSections(projectGid, opts)
		},
		getSection(sectionGid: string) {
			return gateway.getSection(sectionGid)
		},
		createSection(projectGid: string, name: string) {
			return gateway.createSection(projectGid, name)
		},
		updateSection(sectionGid: string, name: string) {
			return gateway.updateSection(sectionGid, name)
		},
		deleteSection(sectionGid: string) {
			return gateway.deleteSection(sectionGid)
		},
	}
}

function defaultSectionApi() {
	return createSectionApi(createAsanaSectionGateway(createClient()))
}

export async function listSections(projectGid: string, opts?: PaginationOptions) {
	return defaultSectionApi().listSections(projectGid, opts)
}

export async function getSection(sectionGid: string) {
	return defaultSectionApi().getSection(sectionGid)
}

export async function createSection(projectGid: string, name: string) {
	return defaultSectionApi().createSection(projectGid, name)
}

export async function updateSection(sectionGid: string, name: string) {
	return defaultSectionApi().updateSection(sectionGid, name)
}

export async function deleteSection(sectionGid: string) {
	return defaultSectionApi().deleteSection(sectionGid)
}

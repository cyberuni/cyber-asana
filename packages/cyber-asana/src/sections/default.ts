import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createSectionApi } from './api.js'
import { createAsanaSectionGateway, type SectionPlacement, type TaskPlacement } from './gateway.js'

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

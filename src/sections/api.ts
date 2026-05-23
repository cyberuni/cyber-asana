import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listSections(projectGid: string, opts?: PaginationOptions) {
	const api = new Asana.SectionsApi(createClient())
	const res = await api.getSectionsForProject(projectGid, toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
}

export async function getSection(sectionGid: string) {
	const api = new Asana.SectionsApi(createClient())
	const res = await api.getSection(sectionGid, {})
	return res.data
}

export async function createSection(projectGid: string, name: string) {
	const api = new Asana.SectionsApi(createClient())
	const res = await api.createSectionForProject(projectGid, { body: { data: { name } } })
	return res.data
}

export async function updateSection(sectionGid: string, name: string) {
	const api = new Asana.SectionsApi(createClient())
	const res = await api.updateSection(sectionGid, { body: { data: { name } } })
	return res.data
}

export async function deleteSection(sectionGid: string) {
	const api = new Asana.SectionsApi(createClient())
	await api.deleteSection(sectionGid)
}

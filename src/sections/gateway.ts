import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type SectionGateway = {
	listSections(projectGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getSection(sectionGid: string): Promise<any>
	createSection(projectGid: string, name: string): Promise<any>
	updateSection(sectionGid: string, name: string): Promise<any>
	deleteSection(sectionGid: string): Promise<void>
}

export function createAsanaSectionGateway(client: Asana.ApiClient): SectionGateway {
	const sectionsApi = new Asana.SectionsApi(client)

	return {
		async listSections(projectGid, opts) {
			const res = await sectionsApi.getSectionsForProject(projectGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getSection(sectionGid) {
			const res = await sectionsApi.getSection(sectionGid, {})
			return res.data
		},
		async createSection(projectGid, name) {
			const res = await sectionsApi.createSectionForProject(projectGid, { body: { data: { name } } })
			return res.data
		},
		async updateSection(sectionGid, name) {
			const res = await sectionsApi.updateSection(sectionGid, { body: { data: { name } } })
			return res.data
		},
		async deleteSection(sectionGid) {
			await sectionsApi.deleteSection(sectionGid)
		},
	}
}

import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type SectionGateway = {
	listSections(projectGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getSection(sectionGid: string, opts?: ReadOptions): Promise<any>
	createSection(projectGid: string, name: string, opts?: SectionPlacement): Promise<any>
	updateSection(sectionGid: string, name: string): Promise<any>
	deleteSection(sectionGid: string): Promise<void>
	moveSection(projectGid: string, sectionGid: string, opts?: SectionPlacement): Promise<void>
	addTaskToSection(sectionGid: string, taskGid: string, opts?: TaskPlacement): Promise<void>
}

/** Where a section lands relative to another section in the same project. */
export type SectionPlacement = { insertBefore?: string; insertAfter?: string }

/** Where a task lands relative to another task in the same section. */
export type TaskPlacement = { insertBefore?: string; insertAfter?: string }

export function createAsanaSectionGateway(client: Asana.ApiClient): SectionGateway {
	const sectionsApi = new Asana.SectionsApi(client)

	return {
		async listSections(projectGid, opts) {
			const res = await sectionsApi.getSectionsForProject(projectGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getSection(sectionGid, opts) {
			const res = await sectionsApi.getSection(sectionGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createSection(projectGid, name, opts) {
			const res = await sectionsApi.createSectionForProject(projectGid, {
				body: {
					data: {
						name,
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
			})
			return res.data
		},
		async updateSection(sectionGid, name) {
			const res = await sectionsApi.updateSection(sectionGid, { body: { data: { name } } })
			return res.data
		},
		async deleteSection(sectionGid) {
			await sectionsApi.deleteSection(sectionGid)
		},
		async moveSection(projectGid, sectionGid, opts) {
			await sectionsApi.insertSectionForProject(projectGid, {
				body: {
					data: {
						section: sectionGid,
						...(opts?.insertBefore !== undefined && { before_section: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { after_section: opts.insertAfter }),
					},
				},
			})
		},
		async addTaskToSection(sectionGid, taskGid, opts) {
			await sectionsApi.addTaskForSection(sectionGid, {
				body: {
					data: {
						task: taskGid,
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
			})
		},
	}
}

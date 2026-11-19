import Asana from 'asana'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** What a brief carries on write. `text` is plain; `html_text` is Asana rich text and wins when both are sent. */
export type ProjectBriefFields = {
	title?: string
	text?: string
	html_text?: string
}

export type ProjectBriefGateway = {
	getProjectBrief(projectBriefGid: string, opts?: ReadOptions): Promise<Asana.ProjectBrief>
	createProjectBrief(projectGid: string, fields: ProjectBriefFields, opts?: ReadOptions): Promise<Asana.ProjectBrief>
	updateProjectBrief(
		projectBriefGid: string,
		fields: ProjectBriefFields,
		opts?: ReadOptions,
	): Promise<Asana.ProjectBrief>
	deleteProjectBrief(projectBriefGid: string): Promise<void>
}

export function createAsanaProjectBriefGateway(client: Asana.ApiClient): ProjectBriefGateway {
	const briefsApi = new Asana.ProjectBriefsApi(client)

	return {
		async getProjectBrief(projectBriefGid, opts) {
			const res = await briefsApi.getProjectBrief(projectBriefGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createProjectBrief(projectGid, fields, opts) {
			const res = await briefsApi.createProjectBrief({ data: fields }, projectGid, toAsanaReadOptions(opts))
			return res.data
		},
		async updateProjectBrief(projectBriefGid, fields, opts) {
			const res = await briefsApi.updateProjectBrief({ data: fields }, projectBriefGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deleteProjectBrief(projectBriefGid) {
			await briefsApi.deleteProjectBrief(projectBriefGid)
		},
	}
}

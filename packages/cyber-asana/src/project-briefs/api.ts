import { checkHtml } from '../asana-html/api.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { ProjectBriefFields, ProjectBriefGateway } from './gateway.js'

export type { ProjectBriefFields } from './gateway.js'

export type ProjectBriefApi = ReturnType<typeof createProjectBriefApi>

/**
 * Asana answers rich text it cannot parse with "XML is invalid" and no detail, so a brief's `html_text`
 * is checked against the project-brief surface first and the problems are named.
 */
function assertBriefHtml(fields: ProjectBriefFields) {
	if (fields.html_text === undefined) return
	const problems = checkHtml(fields.html_text, 'project-brief')
	if (problems.length === 0) return
	throw new Error(
		`html_text is not valid for a project brief: ${problems.join('; ')}. Run \`cyber-asana html fix --surface project-brief\` to normalize it.`,
	)
}

export function createProjectBriefApi(gateway: ProjectBriefGateway) {
	return {
		getProjectBrief(projectBriefGid: string, opts?: ReadOptions) {
			return gateway.getProjectBrief(projectBriefGid, opts)
		},
		async createProjectBrief(projectGid: string, fields: ProjectBriefFields) {
			assertBriefHtml(fields)
			return gateway.createProjectBrief(projectGid, fields)
		},
		async updateProjectBrief(projectBriefGid: string, fields: ProjectBriefFields) {
			assertBriefHtml(fields)
			return gateway.updateProjectBrief(projectBriefGid, fields)
		},
		deleteProjectBrief(projectBriefGid: string) {
			return gateway.deleteProjectBrief(projectBriefGid)
		},
	}
}

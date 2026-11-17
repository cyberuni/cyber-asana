import { expect, it } from 'vitest'
import type { ProjectBriefApi } from './api.js'

export type ProjectBriefLifecycleDeps = {
	getApi: () => Pick<
		ProjectBriefApi,
		'createProjectBrief' | 'getProjectBrief' | 'updateProjectBrief' | 'deleteProjectBrief'
	>
	projectGid: string
}

/**
 * The create, read, update, delete round trip of one project brief: the request bodies behind
 * `project-brief create | get | update | delete`. It deletes the brief it makes, and the second delete
 * checks that a repeat is not an error the caller has to handle.
 */
export function defineProjectBriefLifecycleAcceptanceSpecs(deps: ProjectBriefLifecycleDeps) {
	return () => {
		it('creates, reads, updates and deletes a brief', async () => {
			const api = deps.getApi()
			const created = await api.createProjectBrief(deps.projectGid, {
				title: 'cyber-asana probe',
				html_text: '<body><h1>Goal</h1>Ship the probe</body>',
			})
			try {
				expect(created.gid).toBeTruthy()

				const read = await api.getProjectBrief(created.gid, { optFields: 'gid,title,html_text' })
				expect(read.title).toBe('cyber-asana probe')
				expect(read.html_text).toContain('Ship the probe')

				const updated = await api.updateProjectBrief(created.gid, { title: 'cyber-asana probe v2' })
				expect(updated.title).toBe('cyber-asana probe v2')
			} finally {
				await api.deleteProjectBrief(created.gid)
			}
		})
	}
}

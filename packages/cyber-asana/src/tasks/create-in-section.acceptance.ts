import { expect, it } from 'vitest'
import type { TaskApi } from './api.js'

export type CreateInSectionAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'createTask' | 'getTask' | 'deleteTask'>
	workspaceGid: string
	projectGid: string
	sectionGid: string
}

type Membership = { project?: { gid?: string }; section?: { gid?: string } }

export function defineCreateInSectionAcceptanceSpecs(deps: CreateInSectionAcceptanceDeps) {
	return () => {
		it('creates a task directly in a section through a create-time membership', async () => {
			const api = deps.getApi()
			const created = await api.createTask(deps.workspaceGid, 'cyber-asana create-in-section probe', {
				memberships: [{ project: deps.projectGid, section: deps.sectionGid }],
			})
			try {
				const task = await api.getTask(created.gid)
				const memberships = (task.memberships ?? []) as Membership[]
				expect(memberships.map((m) => ({ project: m.project?.gid, section: m.section?.gid }))).toContainEqual({
					project: deps.projectGid,
					section: deps.sectionGid,
				})
			} finally {
				await api.deleteTask(created.gid)
			}
		})
	}
}

import { expect, it } from 'vitest'
import type { SectionApi } from './api.js'

export type SectionWriteAcceptanceDeps = {
	getApi: () => Pick<SectionApi, 'createSection' | 'getSection' | 'deleteSection'>
	projectGid: string
}

export function defineSectionWriteAcceptanceSpecs(deps: SectionWriteAcceptanceDeps) {
	return () => {
		it('creates a section in the project and reads it back', async () => {
			const api = deps.getApi()
			const created = await api.createSection(deps.projectGid, 'cyber-asana write probe: section')
			try {
				const section = await api.getSection(created.gid, { optFields: 'name' })
				expect(section.name).toBe('cyber-asana write probe: section')
			} finally {
				await api.deleteSection(created.gid)
			}
		})
	}
}

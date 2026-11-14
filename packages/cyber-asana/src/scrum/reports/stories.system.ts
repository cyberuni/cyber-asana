import { describe, expect, it } from 'vitest'
import { createClient } from '../../platform/client.js'
import { listItems } from '../../platform/pagination.js'
import { createAsanaSectionGateway } from '../../sections/gateway.js'
import { createAsanaStoryGateway } from '../../stories/gateway.js'
import { createAsanaTaskGateway } from '../../tasks/gateway.js'
import { isSystemTestEnabled, systemEnv } from '../../testing/system.js'
import { STORY_SUBTYPES, type TaskStory } from './stories.js'

// G14: the `resource_subtype` values the retro and sprint reports read come from Asana's docs, not
// the SDK. This probe makes the stories they depend on and checks the values are the ones we read.
const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const sectionGid = systemEnv('ASANA_SYSTEM_TEST_SECTION_GID')
const enabled = isSystemTestEnabled() && Boolean(workspaceGid && projectGid && sectionGid)

describe.skipIf(!enabled)('scrum reports: system story subtypes (G14)', () => {
	it('shows section_changed, dependency_added and dependency_marked_complete on a probe task', async () => {
		const client = createClient()
		const tasks = createAsanaTaskGateway(client)
		const sections = createAsanaSectionGateway(client)
		const stories = createAsanaStoryGateway(client)
		const probe = await tasks.createTask(workspaceGid as string, 'cyber-asana G14 probe', {
			projects: [projectGid as string],
		})
		const blocker = await tasks.createTask(workspaceGid as string, 'cyber-asana G14 probe blocker', {
			projects: [projectGid as string],
		})
		try {
			await sections.addTaskToSection(sectionGid as string, probe.gid)
			await tasks.addDependencies(probe.gid, [blocker.gid])
			await tasks.updateTask(blocker.gid, { completed: true })
			const seen = listItems(
				await stories.listStories(probe.gid, {
					fetchAll: true,
					optFields: 'resource_subtype,created_at,text',
				} as never),
			) as TaskStory[]
			const subtypes = new Set(seen.map((s) => s.resource_subtype))
			console.log('observed story subtypes:', [...subtypes].join(', '))
			expect(subtypes).toContain(STORY_SUBTYPES.sectionChanged)
			expect(subtypes).toContain(STORY_SUBTYPES.dependencyAdded)
			expect(subtypes).toContain(STORY_SUBTYPES.dependencyMarkedComplete)
			expect(seen.every((s) => typeof s.created_at === 'string')).toBe(true)
		} finally {
			await tasks.deleteTask(probe.gid)
			await tasks.deleteTask(blocker.gid)
		}
	})
})

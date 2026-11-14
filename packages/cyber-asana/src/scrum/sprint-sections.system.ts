import { describe } from 'vitest'
import { createClient } from '../platform/client.js'
import { listItems } from '../platform/pagination.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { createAsanaSectionGateway } from '../sections/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { createAsanaUserGateway } from '../users/gateway.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintSectionsAcceptanceSpecs } from './sprint-sections.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const enabled = isSystemTestEnabled() && Boolean(workspaceGid && projectGid)

type Live = ReturnType<typeof live>
let cached: Live | undefined

function live() {
	const client = createClient()
	const sections = createAsanaSectionGateway(client)
	const tasks = createAsanaTaskGateway(client)
	const api = createScrumApi({
		store: () => ({
			load: async () => ({
				scopes: [{ name: 'system', kind: 'project' as const, projects: [projectGid as string], default: true }],
				sources: {},
			}),
			add: async () => {
				throw new Error('read-only')
			},
			remove: async () => {
				throw new Error('read-only')
			},
		}),
		gateways: { portfolios: createAsanaPortfolioGateway(client), tasks },
		sprint: { sections, tasks, users: createAsanaUserGateway(client) },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
	})
	return { api, sections, tasks }
}

const get = () => {
	cached ??= live()
	return cached
}

// Sections creation under a sprint name and moving a task between a project's sections: the call
// shapes of the `sections` sprint model. The spec deletes the probe sections and task it makes.
describe.skipIf(!enabled)(
	'scrum/sprint sections system',
	defineSprintSectionsAcceptanceSpecs({
		getApi: () => get().api,
		createTask: async (name) =>
			(await get().tasks.createTask(workspaceGid as string, name, { projects: [projectGid as string] })).gid,
		sectionNameOf: async (taskGid) => {
			const task = await get().tasks.getTask(taskGid, { optFields: 'memberships.project.gid,memberships.section.name' })
			const memberships = (task.memberships ?? []) as Array<{ project?: { gid?: string }; section?: { name?: string } }>
			return memberships.find((m) => m.project?.gid === projectGid)?.section?.name
		},
		deleteTask: (taskGid) => get().tasks.deleteTask(taskGid),
		deleteSections: async (names) => {
			const all = listItems(await get().sections.listSections(projectGid as string, { fetchAll: true })) as Array<{
				gid: string
				name: string
			}>
			for (const section of all.filter((s) => names.includes(s.name))) await get().sections.deleteSection(section.gid)
		},
	}),
)

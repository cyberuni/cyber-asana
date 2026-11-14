import { afterAll, beforeAll, describe } from 'vitest'
import { createAsanaJobGateway } from '../jobs/gateway.js'
import { createClient } from '../platform/client.js'
import { listItems } from '../platform/pagination.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { newProjectOf } from '../project-templates/api.js'
import { createProjectApi } from '../projects/api.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import { createAsanaSectionGateway } from '../sections/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { createAsanaUserGateway } from '../users/gateway.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintProjectAcceptanceSpecs } from './sprint-project.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
// Portfolios are a paid feature.
const enabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid && projectGid)

const client = () => createClient()

function live(portfolioGid: string) {
	const c = client()
	const tasks = createAsanaTaskGateway(c)
	const portfolios = createAsanaPortfolioGateway(c)
	const projects = createAsanaProjectGateway(c)
	const projectApi = createProjectApi(projects, { jobs: createAsanaJobGateway(c) })
	const api = createScrumApi({
		store: () => ({
			load: async () => ({
				scopes: [
					{
						name: 'system',
						kind: 'project' as const,
						projects: [projectGid as string],
						sprint_portfolio: portfolioGid,
						default: true,
					},
				],
				sources: {},
			}),
			add: async () => {
				throw new Error('read-only')
			},
			remove: async () => {
				throw new Error('read-only')
			},
		}),
		gateways: { portfolios, tasks },
		sprint: {
			sections: createAsanaSectionGateway(c),
			tasks,
			users: createAsanaUserGateway(c),
			projectModel: {
				portfolios,
				projects,
				tasks,
				duplicateProject: async (templateGid, fields) => {
					const job = await projectApi.duplicateProjectAndWait(templateGid, fields)
					return { gid: newProjectOf(job)?.gid as string }
				},
			},
		},
		dependencies: tasks,
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', sprint_model: 'project' }),
	})
	return { api, tasks, portfolios, projects }
}

let portfolioGid: string | undefined
let cached: ReturnType<typeof live> | undefined
const get = () => {
	if (!cached) throw new Error('the probe portfolio is not created yet')
	return cached
}

// The `project` sprint model against live Asana: a project created per sprint and added to a
// portfolio, a task multi-homed into it with `addProjectForTask`, and a close that moves the task on.
// It makes a throwaway portfolio, and deletes it and the probe sprint projects afterwards.
describe.skipIf(!enabled)('scrum/sprint project system', () => {
	beforeAll(async () => {
		const portfolio = await createAsanaPortfolioGateway(client()).createPortfolio(
			workspaceGid as string,
			`cyber-asana sprint probe ${Date.now()}`,
		)
		portfolioGid = portfolio.gid
		cached = live(portfolio.gid)
	})
	afterAll(async () => {
		if (portfolioGid) await createAsanaPortfolioGateway(client()).deletePortfolio(portfolioGid)
	})

	defineSprintProjectAcceptanceSpecs({
		getApi: () => get().api,
		createTask: async (name) =>
			(await get().tasks.createTask(workspaceGid as string, name, { projects: [projectGid as string] })).gid,
		homesOf: async (taskGid) => {
			const task = (await get().tasks.getTask(taskGid, { optFields: 'memberships.project.name' })) as unknown as {
				memberships?: Array<{ project?: { name?: string } }>
			}
			return (task.memberships ?? []).flatMap((m) => (m.project?.name ? [m.project.name] : []))
		},
		deleteTask: (taskGid) => get().tasks.deleteTask(taskGid),
		deleteSprintProjects: async (names) => {
			const items = listItems(
				await get().portfolios.listPortfolioItems(portfolioGid as string, { fetchAll: true, optFields: 'name' }),
			) as Array<{ gid: string; name?: string }>
			for (const item of items) if (item.name && names.includes(item.name)) await get().projects.deleteProject(item.gid)
		},
	})()
})

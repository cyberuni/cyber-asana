import { createAsanaAllocationGateway } from '../allocations/gateway.js'
import { createFileScopeStore } from '../config/scope-store.js'
import { createAsanaCustomFieldGateway } from '../custom-fields/gateway.js'
import { createAsanaJobGateway } from '../jobs/gateway.js'
import { createAsanaOooGateway } from '../ooo/gateway.js'
import { createClient } from '../platform/client.js'
import { listReferenceImplementations } from '../platform/reference-implementations.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { newProjectOf } from '../project-templates/api.js'
import { createProjectApi } from '../projects/api.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import { createAsanaSectionGateway } from '../sections/gateway.js'
import { createAsanaStatusGateway } from '../status/gateway.js'
import { createAsanaStoryGateway } from '../stories/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { createAsanaTeamGateway } from '../teams/gateway.js'
import { createAsanaUserGateway } from '../users/gateway.js'
import { createScrumApi, type ScrumApi } from './api.js'
import { loadScrumPolicy } from './policy.js'
import { loadDashboardSettings } from './reports/dashboard.js'
import { loadHealthSettings } from './reports/health.js'
import { loadWorkloadSettings } from './reports/workload.js'

/** The scrum API wired to the live Asana client, the config files, and the shipped policy reference. */
export function createDefaultScrumApi(): ScrumApi {
	const client = createClient()
	const tasks = createAsanaTaskGateway(client)
	const portfolios = createAsanaPortfolioGateway(client)
	const projectGateway = createAsanaProjectGateway(client)
	const projectApi = createProjectApi(projectGateway, { jobs: createAsanaJobGateway(client) })
	return createScrumApi({
		store: createFileScopeStore,
		gateways: { portfolios, tasks, teams: createAsanaTeamGateway(client) },
		sprint: {
			sections: createAsanaSectionGateway(client),
			tasks,
			users: createAsanaUserGateway(client),
			fieldModel: {
				customFields: createAsanaCustomFieldGateway(client),
				tasks,
				projects: projectGateway,
			},
			projectModel: {
				portfolios,
				projects: projectGateway,
				tasks,
				duplicateProject: async (templateGid, fields) => {
					const job = await projectApi.duplicateProjectAndWait(templateGid, fields)
					const created = newProjectOf(job)
					if (!created?.gid) throw new Error(`Asana job ${job.gid} succeeded but named no new project`)
					return { gid: created.gid }
				},
			},
		},
		dependencies: tasks,
		history: { statuses: createAsanaStatusGateway(client), stories: createAsanaStoryGateway(client) },
		loadPolicy: () => loadScrumPolicy(),
		loadHealthSettings: () => loadHealthSettings(),
		allocations: createAsanaAllocationGateway(client),
		ooo: createAsanaOooGateway(client),
		loadWorkloadSettings: () => loadWorkloadSettings(),
		loadDashboardSettings: () => loadDashboardSettings(),
		listReports: () => listReferenceImplementations('cyber-asana.report'),
	})
}

export async function listScopes(...args: Parameters<ScrumApi['listScopes']>) {
	return createDefaultScrumApi().listScopes(...args)
}

export async function addScope(...args: Parameters<ScrumApi['addScope']>) {
	return createDefaultScrumApi().addScope(...args)
}

export async function removeScope(...args: Parameters<ScrumApi['removeScope']>) {
	return createDefaultScrumApi().removeScope(...args)
}

export async function resolveScope(...args: Parameters<ScrumApi['resolveScope']>) {
	return createDefaultScrumApi().resolveScope(...args)
}

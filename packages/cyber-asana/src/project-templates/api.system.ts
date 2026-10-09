import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { listItems } from '../platform/pagination.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineProjectTemplateListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getRuntimeContext() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext
}

function getProjectTemplateApi() {
	return getRuntimeContext().projectTemplates
}

let teamGidPromise: Promise<string | undefined> | undefined

/** Asana rejects `workspace` for `getProjectTemplates` on an organization; it wants a `team` instead. */
function resolveTeamGid(): Promise<string | undefined> {
	teamGidPromise ??= (async () => {
		const workspace = await getRuntimeContext().workspaces.getWorkspace(workspaceGid!, { optFields: 'is_organization' })
		if (!workspace.is_organization) return undefined
		const teams = [
			...listItems<{ gid: string }>(await getRuntimeContext().teams.listTeams(workspaceGid!, { limit: 1 })),
		]
		return teams[0]?.gid
	})()
	return teamGidPromise
}

describe.skipIf(!systemEnabled)(
	'project-templates/api list pagination system',
	defineProjectTemplateListPaginationAcceptanceSpecs({
		getApi: getProjectTemplateApi,
		workspaceGid: workspaceGid!,
		getTeamGid: resolveTeamGid,
		includeFetchAll: false,
	}),
)

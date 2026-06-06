import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineTeamListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getTeamApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.teams
}

describe.skipIf(!systemEnabled)(
	'teams/api list pagination system',
	defineTeamListPaginationAcceptanceSpecs({
		getApi: getTeamApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

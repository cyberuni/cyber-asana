import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import {
	defineTeamListPaginationAcceptanceSpecs,
	defineTeamMembersPaginationAcceptanceSpecs,
	defineTeamProjectsPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const teamGid = systemEnv('ASANA_SYSTEM_TEST_TEAM_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)
const teamSystemEnabled = isSystemTestEnabled() && Boolean(teamGid)

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

describe.skipIf(!teamSystemEnabled)(
	'teams/api members pagination system',
	defineTeamMembersPaginationAcceptanceSpecs({
		getApi: getTeamApi,
		teamGid: teamGid!,
		includeFetchAll: false,
	}),
)

describe.skipIf(!teamSystemEnabled)(
	'teams/api projects pagination system',
	defineTeamProjectsPaginationAcceptanceSpecs({
		getApi: getTeamApi,
		teamGid: teamGid!,
		includeFetchAll: false,
	}),
)

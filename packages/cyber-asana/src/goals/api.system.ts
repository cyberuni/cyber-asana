import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineGoalListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
// Asana answers Payment Required to this resource on a free plan.
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getGoalApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.goals
}

describe.skipIf(!systemEnabled)(
	'goals/api list pagination system',
	defineGoalListPaginationAcceptanceSpecs({
		getApi: getGoalApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { definePortfolioListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
// Asana answers Payment Required to this resource on a free plan.
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getPortfolioApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.portfolios
}

describe.skipIf(!systemEnabled)(
	'portfolios/api list pagination system',
	definePortfolioListPaginationAcceptanceSpecs({
		getApi: getPortfolioApi,
		workspaceGid: workspaceGid!,
		// Asana requires an owner to list portfolios; "me" always resolves to the calling token.
		owner: 'me',
		includeFetchAll: false,
	}),
)

import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { definePortfolioItemsAcceptanceSpecs } from './items.acceptance.js'
import { definePortfolioListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
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

const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')

describe.skipIf(!(systemEnabled && projectGid))(
	'portfolios/api item add and remove system',
	definePortfolioItemsAcceptanceSpecs({
		getApi: getPortfolioApi,
		workspaceGid: workspaceGid!,
		projectGid: projectGid!,
		uniqueName: () => `cyber-asana system test ${Date.now()}`,
	}),
)

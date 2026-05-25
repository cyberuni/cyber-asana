import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { definePortfolioListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

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
		includeFetchAll: false,
	}),
)

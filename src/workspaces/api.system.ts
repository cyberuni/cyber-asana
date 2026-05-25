import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled } from '../testing/system.js'
import { defineWorkspaceListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

let runtimeContext: RuntimeContext | undefined

function getWorkspaceApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.workspaces
}

describe.skipIf(!isSystemTestEnabled())(
	'workspaces/api list pagination system',
	defineWorkspaceListPaginationAcceptanceSpecs({
		getApi: getWorkspaceApi,
		includeFetchAll: false,
	}),
)

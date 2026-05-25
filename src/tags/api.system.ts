import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineTagListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getTagApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.tags
}

describe.skipIf(!systemEnabled)(
	'tags/api list pagination system',
	defineTagListPaginationAcceptanceSpecs({
		getApi: getTagApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

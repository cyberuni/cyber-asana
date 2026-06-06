import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineProjectListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getProjectApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.projects
}

describe.skipIf(!systemEnabled)(
	'projects/api list pagination system',
	defineProjectListPaginationAcceptanceSpecs({
		getApi: getProjectApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

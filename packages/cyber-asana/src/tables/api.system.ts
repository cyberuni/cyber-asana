import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineTableListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
// Tables need an Advanced, Enterprise or Enterprise+ plan; Asana answers Payment Required otherwise.
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

describe.skipIf(!systemEnabled)(
	'tables/api list pagination system',
	defineTableListPaginationAcceptanceSpecs({
		getApi: () => {
			runtimeContext ??= createRuntimeContext()
			return runtimeContext.tables
		},
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

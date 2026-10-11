import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineOooListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getOooApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.ooo
}

describe.skipIf(!systemEnabled)(
	'ooo/api list pagination system',
	defineOooListPaginationAcceptanceSpecs({
		getApi: getOooApi,
		// `me` needs no extra env var — every token has an authenticated user.
		userGid: 'me',
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

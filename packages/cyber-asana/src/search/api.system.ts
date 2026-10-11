import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineTypeaheadAcceptanceSpecs } from './typeahead.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

let runtimeContext: RuntimeContext | undefined

function getSearchApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.search
}

describe.skipIf(!systemEnabled)(
	'search/api typeahead system',
	defineTypeaheadAcceptanceSpecs({
		getApi: getSearchApi,
		workspaceGid: workspaceGid!,
	}),
)

import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import {
	defineAiStudioRunListPaginationAcceptanceSpecs,
	defineAiStudioSeatListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
// The usage endpoints answer only service accounts in AI Studio–licensed orgs, so they
// get their own opt-in rather than riding on every workspace-scoped run.
const systemEnabled =
	isSystemTestEnabled() && Boolean(workspaceGid) && Boolean(systemEnv('ASANA_SYSTEM_TEST_AI_STUDIO'))

let runtimeContext: RuntimeContext | undefined

function getAiStudioApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.aiStudio
}

describe.skipIf(!systemEnabled)(
	'ai-studio/api runs list pagination system',
	defineAiStudioRunListPaginationAcceptanceSpecs({
		getApi: getAiStudioApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

describe.skipIf(!systemEnabled)(
	'ai-studio/api seats list pagination system',
	defineAiStudioSeatListPaginationAcceptanceSpecs({
		getApi: getAiStudioApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

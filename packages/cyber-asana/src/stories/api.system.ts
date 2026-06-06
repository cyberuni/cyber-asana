import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineStoryListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(taskGid)

let runtimeContext: RuntimeContext | undefined

function getStoryApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.stories
}

describe.skipIf(!systemEnabled)(
	'stories/api list pagination system',
	defineStoryListPaginationAcceptanceSpecs({
		getApi: getStoryApi,
		taskGid: taskGid!,
		includeFetchAll: false,
	}),
)

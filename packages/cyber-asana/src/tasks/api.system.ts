import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineBatchLookupAcceptanceSpecs } from './batch-lookup.acceptance.js'
import { defineTaskListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const primaryTaskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(primaryTaskGid)
const listPaginationEnabled = isSystemTestEnabled() && Boolean(projectGid)

let runtimeContext: RuntimeContext | undefined

function getTaskApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.tasks
}

describe.skipIf(!systemEnabled)(
	'tasks/api batch lookup system',
	defineBatchLookupAcceptanceSpecs({
		getApi: getTaskApi,
		primaryTaskGid: primaryTaskGid!,
		secondaryTaskGid: systemEnv('ASANA_SYSTEM_TEST_SECOND_TASK_GID'),
	}),
)

describe.skipIf(!listPaginationEnabled)(
	'tasks/api list pagination system',
	defineTaskListPaginationAcceptanceSpecs({
		getApi: getTaskApi,
		projectGid: projectGid!,
		includeFetchAll: false,
	}),
)

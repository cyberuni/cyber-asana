import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineBatchLookupAcceptanceSpecs } from './batch-lookup.acceptance.js'

const primaryTaskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(primaryTaskGid)

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

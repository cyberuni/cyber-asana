import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineTimeTrackingLifecycleAcceptanceSpecs } from './lifecycle.acceptance.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(taskGid)

let runtimeContext: RuntimeContext | undefined

function getTimeTrackingApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.timeTracking
}

// Logs time on the fixture task and deletes the entry at the end. The request bodies come from Asana's
// docs and are unverified until this suite runs against a paid workspace.
describe.skipIf(!systemEnabled)(
	'time-tracking/api lifecycle system',
	defineTimeTrackingLifecycleAcceptanceSpecs({ getApi: getTimeTrackingApi, taskGid: taskGid! }),
)

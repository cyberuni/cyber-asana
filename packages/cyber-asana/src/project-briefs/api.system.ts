import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineProjectBriefLifecycleAcceptanceSpecs } from './lifecycle.acceptance.js'

const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(projectGid)

let runtimeContext: RuntimeContext | undefined

function getProjectBriefApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.projectBriefs
}

// Creates a brief on the fixture project and deletes it at the end. The project must hold no brief yet.
describe.skipIf(!systemEnabled)(
	'project-briefs/api lifecycle system',
	defineProjectBriefLifecycleAcceptanceSpecs({ getApi: getProjectBriefApi, projectGid: projectGid! }),
)

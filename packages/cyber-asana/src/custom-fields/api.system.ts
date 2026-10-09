import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import {
	defineCustomFieldListPaginationAcceptanceSpecs,
	defineCustomFieldSettingsListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE')
// Asana answers Payment Required to this resource on a free plan.
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid)
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const settingsSystemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(projectGid)

let runtimeContext: RuntimeContext | undefined

function getCustomFieldApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.customFields
}

describe.skipIf(!systemEnabled)(
	'custom-fields/api list pagination system',
	defineCustomFieldListPaginationAcceptanceSpecs({
		getApi: getCustomFieldApi,
		workspaceGid: workspaceGid!,
		includeFetchAll: false,
	}),
)

describe.skipIf(!settingsSystemEnabled)(
	'custom-fields/api settings list pagination system',
	defineCustomFieldSettingsListPaginationAcceptanceSpecs({
		getApi: getCustomFieldApi,
		projectGid: projectGid!,
		includeFetchAll: false,
	}),
)

import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineBatchLookupAcceptanceSpecs } from './batch-lookup.acceptance.js'
import { defineCreateInSectionAcceptanceSpecs } from './create-in-section.acceptance.js'
import { defineGetWithStoriesAcceptanceSpecs } from './get-with-stories.acceptance.js'
import { defineTaskListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'
import { defineSubtaskPositionAcceptanceSpecs } from './subtask-position.acceptance.js'

const primaryTaskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(primaryTaskGid)
const listPaginationEnabled = isSystemTestEnabled() && Boolean(projectGid)
const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const sectionGid = systemEnv('ASANA_SYSTEM_TEST_SECTION_GID')
const createInSectionEnabled = isSystemTestEnabled() && Boolean(workspaceGid && projectGid && sectionGid)

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

describe.skipIf(!systemEnabled)(
	'tasks/api get with stories system',
	defineGetWithStoriesAcceptanceSpecs({ getApi: getTaskApi, taskGid: primaryTaskGid! }),
)

describe.skipIf(!listPaginationEnabled)(
	'tasks/api list pagination system',
	defineTaskListPaginationAcceptanceSpecs({
		getApi: getTaskApi,
		projectGid: projectGid!,
		includeFetchAll: false,
	}),
)

describe.skipIf(!createInSectionEnabled)(
	'tasks/api create in section system',
	defineCreateInSectionAcceptanceSpecs({
		getApi: getTaskApi,
		workspaceGid: workspaceGid!,
		projectGid: projectGid!,
		sectionGid: sectionGid!,
	}),
)

const subtaskPositionEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

describe.skipIf(!subtaskPositionEnabled)(
	'tasks/api subtask position system',
	defineSubtaskPositionAcceptanceSpecs({ getApi: getTaskApi, workspaceGid: workspaceGid! }),
)

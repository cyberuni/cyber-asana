import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineSectionListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'
import { defineSectionWriteAcceptanceSpecs } from './write-operations.acceptance.js'

const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(projectGid)

let runtimeContext: RuntimeContext | undefined

function getSectionApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.sections
}

describe.skipIf(!systemEnabled)(
	'sections/api list pagination system',
	defineSectionListPaginationAcceptanceSpecs({
		getApi: getSectionApi,
		projectGid: projectGid!,
		includeFetchAll: false,
	}),
)

describe.skipIf(!systemEnabled)(
	'sections/api write operations system',
	defineSectionWriteAcceptanceSpecs({ getApi: getSectionApi, projectGid: projectGid! }),
)

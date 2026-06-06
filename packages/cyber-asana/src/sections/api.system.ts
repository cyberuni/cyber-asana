import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineSectionListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

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

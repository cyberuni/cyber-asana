import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { defineAttachmentListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(taskGid)

let runtimeContext: RuntimeContext | undefined

function getAttachmentApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.attachments
}

describe.skipIf(!systemEnabled)(
	'attachments/api list pagination system',
	defineAttachmentListPaginationAcceptanceSpecs({
		getApi: getAttachmentApi,
		taskGid: taskGid!,
		includeFetchAll: false,
	}),
)

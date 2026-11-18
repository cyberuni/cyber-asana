import { describe } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import {
	defineRecordListPaginationAcceptanceSpecs,
	defineRecordStoryListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const tableGid = systemEnv('ASANA_SYSTEM_TEST_TABLE_GID')
const recordGid = systemEnv('ASANA_SYSTEM_TEST_RECORD_GID')
// Tables need an Advanced, Enterprise or Enterprise+ plan; Asana answers Payment Required otherwise.
const enabled = isSystemTestEnabled() && isPaidPlan()

let runtimeContext: RuntimeContext | undefined

function getRecordApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.records
}

describe.skipIf(!enabled || !tableGid)(
	'records/api list pagination system',
	defineRecordListPaginationAcceptanceSpecs({ getApi: getRecordApi, tableGid: tableGid!, includeFetchAll: false }),
)

describe.skipIf(!enabled || !recordGid)(
	'records/api story list pagination system',
	defineRecordStoryListPaginationAcceptanceSpecs({
		getApi: getRecordApi,
		recordGid: recordGid!,
		includeFetchAll: false,
	}),
)

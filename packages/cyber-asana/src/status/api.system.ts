import { describe, expect, it } from 'vitest'
import { createClient } from '../platform/client.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { createAsanaStatusGateway } from './gateway.js'
import { STATUS_TYPES } from './status-type.js'

const goalGid = systemEnv('ASANA_SYSTEM_TEST_GOAL_GID')
// Goals answer Payment Required on a free plan.
const systemEnabled = isSystemTestEnabled() && isPaidPlan() && Boolean(goalGid)

/** Project-only values: Asana must refuse them on a goal, as `STATUS_TYPES.goal` omits them. */
const PROJECT_ONLY = STATUS_TYPES.project.filter((value) => !STATUS_TYPES.goal.includes(value))

describe.skipIf(!systemEnabled)('status/api goal status_type system', () => {
	// The raw gateway: the api layer would refuse a wrong value before Asana saw it.
	const gateway = () => createAsanaStatusGateway(createClient())

	it.each(STATUS_TYPES.goal)('Asana accepts status_type %s on a goal', async (statusType) => {
		const posted = await gateway().createStatus(goalGid!, { status_type: statusType, title: `probe ${statusType}` })
		try {
			expect(posted.status_type).toBe(statusType)
		} finally {
			await gateway().deleteStatus(posted.gid)
		}
	})

	it.each(PROJECT_ONLY)('Asana refuses status_type %s on a goal', async (statusType) => {
		let posted: { gid: string } | undefined
		try {
			posted = await gateway().createStatus(goalGid!, { status_type: statusType, title: `probe ${statusType}` })
		} catch {
			return
		}
		await gateway().deleteStatus(posted.gid)
		expect.fail(`Asana accepted ${statusType} on a goal`)
	})
})

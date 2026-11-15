import { describe, expect, it } from 'vitest'
import { createRuntimeContext } from '../composition.js'
import { isSystemTestEnabled } from '../testing/system.js'

/**
 * Pins D11's premise (scrum-system.md § 9.1): Asana's `GET /users/me` returns no
 * `time_zone`, with or without `opt_fields`, so `sprint current` reads "today" in the
 * machine's timezone (`timezone_source: machine`). If this test fails because a value
 * now comes back, that is the news: `sprint current` then reports `asana` with no code
 * change, and § 9.1 and the sprints docs page need updating.
 */
describe.skipIf(!isSystemTestEnabled())('users/me time_zone system', () => {
	it('returns no time_zone from user me by default', async () => {
		const { users } = createRuntimeContext()
		const me = (await users.getMe()) as { gid?: string; time_zone?: string }
		expect(me.gid).toBeTruthy()
		expect(me.time_zone).toBeUndefined()
	})

	it('returns no time_zone from user me when opt_fields asks for it', async () => {
		const { users } = createRuntimeContext()
		const me = (await users.getMe({ optFields: 'gid,name,time_zone' })) as { gid?: string; time_zone?: string }
		expect(me.gid).toBeTruthy()
		expect(me.time_zone).toBeUndefined()
	})
})

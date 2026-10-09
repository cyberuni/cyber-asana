import Asana from 'asana'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createClient } from '../client.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'

const taskGid = systemEnv('ASANA_SYSTEM_TEST_TASK_GID')
const enabled = isSystemTestEnabled() && Boolean(taskGid)

describe.skipIf(!enabled)('asana types: TasksApi', () => {
	it('getTask returns a Task whose shape matches the augmented type', async () => {
		const api = new Asana.TasksApi(createClient())

		const res = await api.getTask(taskGid!, {
			opt_fields: 'name,resource_type,completed,permalink_url,notes,assignee.name,projects.name',
		})

		expectTypeOf(res).toEqualTypeOf<Asana.AsanaResponse<Asana.Task>>()
		const task = res.data
		expect(task.gid).toBe(taskGid)
		expect(typeof task.name).toBe('string')
		expect(task.resource_type).toBe('task')
		expect(typeof task.completed).toBe('boolean')
		expect(typeof task.permalink_url).toBe('string')
		expect(typeof task.notes).toBe('string')
		if (task.assignee) expect(typeof task.assignee.gid).toBe('string')
		for (const project of task.projects ?? []) expect(typeof project.gid).toBe('string')
	})
})

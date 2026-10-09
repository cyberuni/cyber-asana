import type Asana from 'asana'
import { type IsAny, isType } from 'type-plus'
import { describe, it } from 'vitest'

describe('asana type augmentation', () => {
	it('types TasksApi.getTask instead of leaving it any', () => {
		type Result = Awaited<ReturnType<Asana.TasksApi['getTask']>>

		isType.f<IsAny<Result>>()
		isType.equal<true, Result, Asana.AsanaResponse<Asana.Task>>()
	})

	it('pins Task.resource_type to the literal "task"', () => {
		isType.equal<true, Asana.Task['resource_type'], 'task'>()
	})

	it('keeps Task read fields optional except the resource identity', () => {
		isType.equal<true, Asana.Task['gid'], string>()
		isType.equal<true, Asana.Task['name'], string>()
		isType.equal<true, Asana.Task['completed'], boolean | undefined>()
		isType.equal<true, Asana.Task['assignee'], Asana.User | undefined>()
	})
})

import type Asana from 'asana'
import { type IsAny, testType } from 'type-plus'
import { describe, it } from 'vitest'

describe('asana type augmentation', () => {
	it('types TasksApi.getTask instead of leaving it any', () => {
		type Result = Awaited<ReturnType<Asana.TasksApi['getTask']>>

		testType.false<IsAny<Result>>(true)
		testType.equal<Result, Asana.AsanaResponse<Asana.Task>>(true)
	})

	it('pins Task.resource_type to the literal "task"', () => {
		testType.equal<Asana.Task['resource_type'], 'task'>(true)
	})

	it('keeps Task read fields optional except the resource identity', () => {
		testType.equal<Asana.Task['gid'], string>(true)
		testType.equal<Asana.Task['name'], string>(true)
		testType.equal<Asana.Task['completed'], boolean | undefined>(true)
		testType.equal<Asana.Task['assignee'], Asana.User | undefined>(true)
	})
})

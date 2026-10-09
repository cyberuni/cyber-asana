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

	it('types ProjectsApi.getProject instead of leaving it any', () => {
		type Result = Awaited<ReturnType<Asana.ProjectsApi['getProject']>>

		testType.false<IsAny<Result>>(true)
		testType.equal<Result, Asana.AsanaResponse<Asana.Project>>(true)
	})

	it('pins Project.resource_type to the literal "project" and types its owner', () => {
		testType.equal<Asana.Project['resource_type'], 'project'>(true)
		testType.equal<Asana.Project['owner'], Asana.User | undefined>(true)
		testType.equal<Asana.Project['workspace'], Asana.Workspace | undefined>(true)
		testType.equal<Asana.Project['notes'], string | undefined>(true)
	})

	it('types list endpoints as an AsanaCollection of the resource', () => {
		type Projects = Awaited<ReturnType<Asana.ProjectsApi['getProjectsForWorkspace']>>
		type Tasks = Awaited<ReturnType<Asana.TasksApi['getTasksForProject']>>

		testType.false<IsAny<Projects>>(true)
		testType.equal<Projects, Asana.AsanaCollection<Asana.Project>>(true)
		testType.equal<Tasks, Asana.AsanaCollection<Asana.Task>>(true)
	})

	it('shapes AsanaCollection like the SDK Collection', () => {
		type C = Asana.AsanaCollection<Asana.Task>

		testType.equal<C['data'], Asana.Task[]>(true)
		testType.equal<C['_response']['next_page'], Asana.NextPage | null>(true)
		testType.equal<Awaited<ReturnType<C['nextPage']>>, C | { data: null }>(true)
	})
})

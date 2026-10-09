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

	it('types the single-resource getters of sections, users, workspaces and tags', () => {
		type Section = Awaited<ReturnType<Asana.SectionsApi['getSection']>>
		type User = Awaited<ReturnType<Asana.UsersApi['getUser']>>
		type Workspace = Awaited<ReturnType<Asana.WorkspacesApi['getWorkspace']>>
		type Tag = Awaited<ReturnType<Asana.TagsApi['getTag']>>

		testType.equal<Section, Asana.AsanaResponse<Asana.Section>>(true)
		testType.equal<User, Asana.AsanaResponse<Asana.User>>(true)
		testType.equal<Workspace, Asana.AsanaResponse<Asana.Workspace>>(true)
		testType.equal<Tag, Asana.AsanaResponse<Asana.Tag>>(true)
	})

	it('pins the resource_type literal of each resource', () => {
		testType.equal<Asana.Section['resource_type'], 'section'>(true)
		testType.equal<Asana.User['resource_type'], 'user'>(true)
		testType.equal<Asana.Workspace['resource_type'], 'workspace'>(true)
		testType.equal<Asana.Tag['resource_type'], 'tag'>(true)
	})

	it('types the list endpoints of each resource as an AsanaCollection', () => {
		type SectionsList = Awaited<ReturnType<Asana.SectionsApi['getSectionsForProject']>>
		type UsersList = Awaited<ReturnType<Asana.UsersApi['getUsersForWorkspace']>>
		type WorkspacesList = Awaited<ReturnType<Asana.WorkspacesApi['getWorkspaces']>>
		type TagsList = Awaited<ReturnType<Asana.TagsApi['getTagsForWorkspace']>>

		testType.equal<SectionsList, Asana.AsanaCollection<Asana.Section>>(true)
		testType.equal<UsersList, Asana.AsanaCollection<Asana.User>>(true)
		testType.equal<WorkspacesList, Asana.AsanaCollection<Asana.Workspace>>(true)
		testType.equal<TagsList, Asana.AsanaCollection<Asana.Tag>>(true)
	})

	it('does not offer limit on getUsersForWorkspace, which the SDK ignores', () => {
		type Opts = NonNullable<Parameters<Asana.UsersApi['getUsersForWorkspace']>[1]>

		testType.false<'limit' extends keyof Opts ? true : false>(true)
		testType.true<'offset' extends keyof Opts ? true : false>(true)
	})

	it('types the task write operations instead of leaving them any', () => {
		type Created = Awaited<ReturnType<Asana.TasksApi['createTask']>>
		type Updated = Awaited<ReturnType<Asana.TasksApi['updateTask']>>
		type Deleted = Awaited<ReturnType<Asana.TasksApi['deleteTask']>>

		testType.false<IsAny<Created>>(true)
		testType.equal<Created, Asana.AsanaResponse<Asana.Task>>(true)
		testType.equal<Updated, Asana.AsanaResponse<Asana.Task>>(true)
		testType.equal<Deleted, Asana.EmptyResponse>(true)
	})

	it('types the request body of createTask and updateTask as TaskRequest', () => {
		type Body = Parameters<Asana.TasksApi['createTask']>[0]

		testType.equal<Body, { data: Asana.TaskRequest }>(true)
		testType.equal<Asana.TaskRequest['completed'], boolean | undefined>(true)
		testType.equal<Asana.TaskRequest['assignee'], string | null | undefined>(true)
		testType.equal<Asana.TaskRequest['projects'], string[] | undefined>(true)
	})

	it('types createSectionForProject and deleteSection', () => {
		type Created = Awaited<ReturnType<Asana.SectionsApi['createSectionForProject']>>
		type Deleted = Awaited<ReturnType<Asana.SectionsApi['deleteSection']>>

		testType.false<IsAny<Created>>(true)
		testType.equal<Created, Asana.AsanaResponse<Asana.Section>>(true)
		testType.equal<Deleted, Asana.EmptyResponse>(true)
		testType.equal<Asana.SectionRequest['name'], string>(true)
	})
})

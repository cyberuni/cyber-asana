import 'asana'

/**
 * Augments the `asana` SDK, whose generated declarations type every request and
 * response as `any`. Each shape here is pinned by `asana.learn.test.ts`: a type is
 * added only together with the learning test that proves it against the live API.
 */
declare module 'asana' {
	interface AsanaResource {
		gid: string
		name: string
		resource_type: string
	}

	interface AsanaResponse<T> {
		data: T
	}

	interface OptionalFields {
		opt_fields?: string | undefined
	}

	interface PaginationOptions extends OptionalFields {
		limit?: number | undefined
		offset?: string | undefined
	}

	interface NextPage {
		offset: string
		path: string
		uri: string
	}

	/**
	 * What list endpoints resolve to: the SDK's `Collection` class, whose
	 * declaration is `export =` and cannot be merged, so this mirrors its runtime shape.
	 * `nextPage()` resolves to `{ data: null }` once the pages run out.
	 */
	interface AsanaCollection<T> {
		data: T[]
		_response: { data: T[]; next_page: NextPage | null }
		nextPage(): Promise<AsanaCollection<T> | { data: null }>
	}

	interface Task extends AsanaResource {
		resource_type: 'task'
		completed?: boolean | undefined
		completed_at?: string | undefined
		created_at?: string | undefined
		due_at?: string | undefined
		due_on?: string | undefined
		html_notes?: string | undefined
		modified_at?: string | undefined
		notes?: string | undefined
		permalink_url?: string | undefined
		resource_subtype?: string | undefined
		start_on?: string | undefined
		assignee?: User | undefined
		followers?: User[] | undefined
		parent?: Task | null | undefined
		memberships?: Array<{ project?: Project | undefined; section?: Section | undefined }> | undefined
		projects?: Project[] | undefined
		tags?: Tag[] | undefined
		workspace?: Workspace | undefined
	}

	interface User extends AsanaResource {
		resource_type: 'user'
		email?: string | undefined
		workspaces?: Workspace[] | undefined
	}

	interface Project extends AsanaResource {
		resource_type: 'project'
		archived?: boolean | undefined
		color?: string | undefined
		completed?: boolean | undefined
		created_at?: string | undefined
		due_on?: string | undefined
		html_notes?: string | undefined
		modified_at?: string | undefined
		notes?: string | undefined
		owner?: User | undefined
		permalink_url?: string | undefined
		public?: boolean | undefined
		start_on?: string | undefined
		workspace?: Workspace | undefined
	}

	interface Tag extends AsanaResource {
		resource_type: 'tag'
		color?: string | undefined
		notes?: string | undefined
		permalink_url?: string | undefined
		workspace?: Workspace | undefined
	}

	interface Workspace extends AsanaResource {
		resource_type: 'workspace'
		email_domains?: string[] | undefined
		is_organization?: boolean | undefined
	}

	interface Section extends AsanaResource {
		resource_type: 'section'
		created_at?: string | undefined
		project?: Project | undefined
		projects?: Project[] | undefined
	}

	/** What a delete resolves to: Asana answers `{ data: {} }`. */
	type EmptyResponse = AsanaResponse<Record<string, never>>

	interface TaskRequest {
		name?: string | undefined
		notes?: string | undefined
		html_notes?: string | undefined
		completed?: boolean | undefined
		due_on?: string | null | undefined
		due_at?: string | null | undefined
		start_on?: string | null | undefined
		start_at?: string | null | undefined
		assignee?: string | null | undefined
		resource_subtype?: 'default_task' | 'milestone' | 'approval' | undefined
		custom_fields?: Record<string, string | number | string[] | null> | undefined
		followers?: string[] | undefined
		projects?: string[] | undefined
		tags?: string[] | undefined
		workspace?: string | undefined
	}

	interface SectionRequest {
		name: string
		insert_before?: string | undefined
		insert_after?: string | undefined
	}

	type StickerName =
		| 'green_checkmark'
		| 'people_dancing'
		| 'dancing_unicorn'
		| 'heart'
		| 'party_popper'
		| 'people_waving_flags'
		| 'splashing_narwhal'
		| 'trophy'
		| 'yeti_riding_unicorn'
		| 'celebrating_people'
		| 'determined_climbers'
		| 'phoenix_spreading_love'

	/** Unlike the other resources a story has no `name`, so it stands apart from AsanaResource. */
	interface Story {
		gid: string
		resource_type: 'story'
		created_at?: string | undefined
		created_by?: User | undefined
		html_text?: string | undefined
		is_editable?: boolean | undefined
		is_edited?: boolean | undefined
		is_pinned?: boolean | undefined
		resource_subtype?: string | undefined
		sticker_name?: StickerName | undefined
		text?: string | undefined
		type?: 'comment' | 'system' | undefined
	}

	interface StoryRequest {
		text?: string | undefined
		html_text?: string | undefined
		is_pinned?: boolean | undefined
		sticker_name?: StickerName | undefined
	}

	interface Attachment extends AsanaResource {
		resource_type: 'attachment'
		created_at?: string | undefined
		download_url?: string | undefined
		host?: string | undefined
		parent?: AsanaResource | undefined
		permanent_url?: string | undefined
		resource_subtype?: string | undefined
		size?: number | undefined
		view_url?: string | undefined
	}

	interface AttachmentRequest extends OptionalFields {
		parent: string
		name?: string | undefined
		url?: string | undefined
		file?: string | undefined
		resource_subtype?: 'external' | 'asana' | undefined
		connect_to_app?: boolean | undefined
	}

	interface StoriesApi {
		createStoryForTask(
			body: { data: StoryRequest },
			task_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Story>>
		getStory(story_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Story>>
		getStoriesForTask(
			task_gid: string,
			opts?: PaginationOptions & {
				created_after?: string | undefined
				resource_subtype?: string | undefined
				sort_ascending?: boolean | undefined
			},
		): Promise<AsanaCollection<Story>>
		updateStory(body: { data: StoryRequest }, story_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Story>>
		deleteStory(story_gid: string): Promise<EmptyResponse>
	}

	interface AttachmentsApi {
		createAttachmentForObject(opts: AttachmentRequest): Promise<AsanaResponse<Attachment>>
		getAttachment(attachment_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Attachment>>
		getAttachmentsForObject(parent: string, opts?: PaginationOptions): Promise<AsanaCollection<Attachment>>
		deleteAttachment(attachment_gid: string): Promise<EmptyResponse>
	}

	interface TasksApi {
		addProjectForTask(
			body: { data: { project: string; section?: string; insert_after?: string; insert_before?: string } },
			task_gid: string,
		): Promise<EmptyResponse>
		removeProjectForTask(body: { data: { project: string } }, task_gid: string): Promise<EmptyResponse>
		addTagForTask(body: { data: { tag: string } }, task_gid: string): Promise<EmptyResponse>
		removeTagForTask(body: { data: { tag: string } }, task_gid: string): Promise<EmptyResponse>
		addFollowersForTask(
			body: { data: { followers: string[] } },
			task_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Task>>
		removeFollowerForTask(
			body: { data: { followers: string[] } },
			task_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Task>>
		setParentForTask(
			body: { data: { parent: string | null; insert_after?: string; insert_before?: string } },
			task_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Task>>
		createSubtaskForTask(
			body: { data: TaskRequest },
			task_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Task>>
		addDependenciesForTask(body: { data: { dependencies: string[] } }, task_gid: string): Promise<EmptyResponse>
		addDependentsForTask(body: { data: { dependents: string[] } }, task_gid: string): Promise<EmptyResponse>
		removeDependenciesForTask(body: { data: { dependencies: string[] } }, task_gid: string): Promise<EmptyResponse>
		removeDependentsForTask(body: { data: { dependents: string[] } }, task_gid: string): Promise<EmptyResponse>
		getDependenciesForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Task>>
		getDependentsForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Task>>
		getSubtasksForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Task>>
		getTasks(
			opts?: PaginationOptions & {
				project?: string | undefined
				section?: string | undefined
				tag?: string | undefined
				assignee?: string | undefined
				workspace?: string | undefined
				completed_since?: string | undefined
				modified_since?: string | undefined
				custom_type?: string | undefined
			},
		): Promise<AsanaCollection<Task>>
		getTasksForSection(
			section_gid: string,
			opts?: PaginationOptions & { completed_since?: string | undefined },
		): Promise<AsanaCollection<Task>>
		getTasksForTag(tag_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Task>>
		getTasksForUserTaskList(
			user_task_list_gid: string,
			opts?: PaginationOptions & { completed_since?: string | undefined },
		): Promise<AsanaCollection<Task>>
		/** Filters are dotted query keys such as `'assignee.any'` or `'due_on.before'`. */
		searchTasksForWorkspace(
			workspace_gid: string,
			opts?: OptionalFields & { limit?: number | undefined } & Record<string, string | number | boolean | undefined>,
		): Promise<AsanaCollection<Task>>
		createTask(body: { data: TaskRequest }, opts?: OptionalFields): Promise<AsanaResponse<Task>>
		updateTask(body: { data: TaskRequest }, task_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Task>>
		deleteTask(task_gid: string): Promise<EmptyResponse>
		getTask(task_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Task>>
		getTasksForProject(
			project_gid: string,
			opts?: PaginationOptions & { completed_since?: string | undefined },
		): Promise<AsanaCollection<Task>>
	}

	interface SectionMoveRequest {
		section: string
		before_section?: string | undefined
		after_section?: string | undefined
	}

	interface SectionTaskRequest {
		task: string
		insert_before?: string | undefined
		insert_after?: string | undefined
	}

	interface SectionsApi {
		updateSection(
			section_gid: string,
			opts: { body: { data: { name: string } }; opt_fields?: string | undefined },
		): Promise<AsanaResponse<Section>>
		insertSectionForProject(project_gid: string, opts: { body: { data: SectionMoveRequest } }): Promise<EmptyResponse>
		addTaskForSection(section_gid: string, opts: { body: { data: SectionTaskRequest } }): Promise<EmptyResponse>
		createSectionForProject(
			project_gid: string,
			opts: { body: { data: SectionRequest }; opt_fields?: string | undefined },
		): Promise<AsanaResponse<Section>>
		deleteSection(section_gid: string): Promise<EmptyResponse>
		getSection(section_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Section>>
		getSectionsForProject(project_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Section>>
	}

	interface UsersApi {
		getUsers(
			opts?: PaginationOptions & { workspace?: string | undefined; team?: string | undefined },
		): Promise<AsanaCollection<User>>
		getUser(user_gid: string, opts?: OptionalFields & { workspace?: string | undefined }): Promise<AsanaResponse<User>>
		// The SDK passes only `offset` and `opt_fields` here; a `limit` would be dropped.
		getUsersForWorkspace(
			workspace_gid: string,
			opts?: OptionalFields & { offset?: string | undefined },
		): Promise<AsanaCollection<User>>
	}

	interface WorkspacesApi {
		getWorkspace(workspace_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Workspace>>
		getWorkspaces(opts?: PaginationOptions): Promise<AsanaCollection<Workspace>>
	}

	interface Team extends AsanaResource {
		resource_type: 'team'
		description?: string | undefined
		html_description?: string | undefined
		organization?: Workspace | undefined
		permalink_url?: string | undefined
	}

	interface UserTaskList extends AsanaResource {
		resource_type: 'user_task_list'
		owner?: User | undefined
		workspace?: Workspace | undefined
	}

	interface Membership {
		gid: string
		resource_type: 'membership'
		access_level?: string | undefined
		resource_subtype?: string | undefined
		member?: AsanaResource | undefined
		parent?: AsanaResource | undefined
	}

	interface OooEntry {
		gid: string
		resource_type: 'ooo_entry'
		start_date?: string | undefined
		end_date?: string | undefined
		user?: User | undefined
	}

	interface StatusUpdate {
		gid: string
		resource_type: 'status_update'
		resource_subtype?: string | undefined
		status_type?: string | undefined
		title?: string | undefined
		text?: string | undefined
		html_text?: string | undefined
		created_at?: string | undefined
		author?: User | undefined
		parent?: AsanaResource | undefined
	}

	interface StatusUpdateRequest {
		parent: string
		status_type: string
		text?: string | undefined
		html_text?: string | undefined
		title?: string | undefined
	}

	interface MembershipsApi {
		getMembership(membership_gid: string): Promise<AsanaResponse<Membership>>
		getMemberships(
			opts?: PaginationOptions & {
				parent?: string | undefined
				member?: string | undefined
				resource_subtype?: string | undefined
			},
		): Promise<AsanaCollection<Membership>>
		createMembership(opts: {
			body: { data: { parent: string; member: string; access_level?: string | undefined } }
		}): Promise<AsanaResponse<Membership>>
		updateMembership(
			body: { data: { access_level?: string | undefined } },
			membership_gid: string,
		): Promise<AsanaResponse<Membership>>
		deleteMembership(membership_gid: string): Promise<EmptyResponse>
	}

	interface OooEntriesApi {
		getOooEntry(ooo_entry_gid: string, opts?: OptionalFields): Promise<AsanaResponse<OooEntry>>
		getOooEntries(
			user: string,
			workspace: string,
			opts?: PaginationOptions & { start_date?: string | undefined; end_date?: string | undefined },
		): Promise<AsanaCollection<OooEntry>>
		createOooEntry(
			body: { data: { user: string; workspace: string; start_date: string; end_date: string } },
			opts?: OptionalFields,
		): Promise<AsanaResponse<OooEntry>>
		updateOooEntry(
			body: { data: { start_date?: string | undefined; end_date?: string | undefined } },
			ooo_entry_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<OooEntry>>
		deleteOooEntry(ooo_entry_gid: string): Promise<EmptyResponse>
	}

	interface StatusUpdatesApi {
		getStatus(status_update_gid: string, opts?: OptionalFields): Promise<AsanaResponse<StatusUpdate>>
		getStatusesForObject(
			parent: string,
			opts?: PaginationOptions & { created_since?: string | undefined },
		): Promise<AsanaCollection<StatusUpdate>>
		createStatusForObject(
			body: { data: StatusUpdateRequest },
			opts?: OptionalFields,
		): Promise<AsanaResponse<StatusUpdate>>
		deleteStatus(status_update_gid: string): Promise<EmptyResponse>
	}

	interface BatchAction {
		method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head'
		relative_path: string
		data?: object | undefined
		options?: { fields?: string[]; limit?: number; offset?: number; pretty?: boolean } | undefined
	}

	interface BatchResult {
		status_code: number
		headers?: Record<string, string> | undefined
		body?: { data?: unknown; errors?: unknown[] } | undefined
	}

	interface AsanaEvent {
		action: string
		type?: string | undefined
		created_at?: string | undefined
		resource?: { gid: string; resource_type: string; resource_subtype?: string } | undefined
		parent?: { gid: string; resource_type: string } | null | undefined
		user?: { gid: string; resource_type: string } | null | undefined
		change?: { field: string; action: string } | undefined
	}

	/** Events resolve to a Collection too, but the sync token rides on `_response`, not on the collection. */
	interface EventCollection extends AsanaCollection<AsanaEvent> {
		_response: AsanaCollection<AsanaEvent>['_response'] & {
			sync?: string | undefined
			has_more?: boolean | undefined
		}
	}

	/** Intersection of a type alias, not an interface, so it stays assignable to `platform/job-polling`'s `Job`. */
	type Job = {
		gid: string
		resource_type: 'job'
		resource_subtype?: string | undefined
		status?: 'not_started' | 'in_progress' | 'succeeded' | 'failed' | 'canceled' | undefined
		new_project?: Project | undefined
		new_task?: Task | undefined
	}

	interface ProjectTemplate extends AsanaResource {
		resource_type: 'project_template'
		description?: string | undefined
		html_description?: string | undefined
		public?: boolean | undefined
		color?: string | null | undefined
		owner?: User | undefined
		team?: Team | undefined
		requested_dates?: Array<{ gid: string; name?: string; description?: string }> | undefined
		requested_roles?: Array<{ gid: string; name?: string }> | undefined
	}

	interface TaskTemplate extends AsanaResource {
		resource_type: 'task_template'
		template?: { name?: string; description?: string } | undefined
		project?: Project | undefined
		created_at?: string | undefined
	}

	interface TypeaheadApi {
		typeaheadForWorkspace(
			workspace_gid: string,
			resource_type: string,
			opts?: OptionalFields & { query?: string | undefined; count?: number | undefined },
		): Promise<AsanaCollection<AsanaResource>>
	}

	interface BatchAPIApi {
		createBatchRequest(
			body: { data: { actions: BatchAction[] } },
			opts?: OptionalFields,
		): Promise<AsanaCollection<BatchResult>>
	}

	interface EventsApi {
		getEvents(resource: string, opts?: OptionalFields & { sync?: string | undefined }): Promise<EventCollection>
	}

	interface RulesApi {
		triggerRule(
			body: { data: { resource?: string; action_data?: Record<string, unknown> } },
			rule_trigger_gid: string,
		): Promise<EmptyResponse>
	}

	interface JobsApi {
		getJob(job_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Job>>
	}

	interface ProjectTemplatesApi {
		getProjectTemplate(project_template_gid: string, opts?: OptionalFields): Promise<AsanaResponse<ProjectTemplate>>
		getProjectTemplates(
			opts?: PaginationOptions & { workspace?: string | undefined; team?: string | undefined },
		): Promise<AsanaCollection<ProjectTemplate>>
		getProjectTemplatesForTeam(team_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<ProjectTemplate>>
		instantiateProject(
			project_template_gid: string,
			opts: { body: { data: Record<string, unknown> }; opt_fields?: string | undefined },
		): Promise<AsanaResponse<Job>>
	}

	interface TaskTemplatesApi {
		getTaskTemplate(task_template_gid: string, opts?: OptionalFields): Promise<AsanaResponse<TaskTemplate>>
		getTaskTemplates(
			opts?: PaginationOptions & { project?: string | undefined },
		): Promise<AsanaCollection<TaskTemplate>>
		instantiateTask(
			task_template_gid: string,
			opts: { body: { data: { name?: string | undefined } }; opt_fields?: string | undefined },
		): Promise<AsanaResponse<Job>>
	}

	interface Portfolio extends AsanaResource {
		resource_type: 'portfolio'
		color?: string | undefined
		created_at?: string | undefined
		owner?: User | undefined
		permalink_url?: string | undefined
		public?: boolean | undefined
		workspace?: Workspace | undefined
	}

	interface TimePeriod extends AsanaResource {
		resource_type: 'time_period'
		display_name?: string | undefined
		period?: string | undefined
		start_on?: string | undefined
		end_on?: string | undefined
	}

	interface TimePeriodsApi {
		getTimePeriod(time_period_gid: string, opts?: OptionalFields): Promise<AsanaResponse<TimePeriod>>
		getTimePeriods(
			workspace: string,
			opts?: PaginationOptions & { start_on?: string | undefined; end_on?: string | undefined },
		): Promise<AsanaCollection<TimePeriod>>
	}

	interface Goal extends AsanaResource {
		resource_type: 'goal'
		notes?: string | undefined
		html_notes?: string | undefined
		due_on?: string | null | undefined
		start_on?: string | null | undefined
		is_workspace_level?: boolean | undefined
		liked?: boolean | undefined
		owner?: User | undefined
		workspace?: Workspace | undefined
	}

	interface CustomField extends AsanaResource {
		resource_type: 'custom_field'
		type?: string | undefined
		description?: string | undefined
		enabled?: boolean | undefined
		precision?: number | undefined
		enum_options?: Array<{ gid: string; name: string; enabled?: boolean; color?: string }> | undefined
	}

	interface CustomFieldSetting {
		gid: string
		resource_type: 'custom_field_setting'
		is_important?: boolean | undefined
		custom_field?: CustomField | undefined
		parent?: AsanaResource | undefined
		project?: Project | undefined
	}

	/** AI Studio usage rows have no documented shape beyond their fields, so each is an open record. */
	type AiStudioRecord = Record<string, unknown>

	interface PortfoliosApi {
		getPortfolio(portfolio_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Portfolio>>
		getPortfolios(
			workspace: string,
			opts?: PaginationOptions & { owner?: string | undefined; custom_type?: string | undefined },
		): Promise<AsanaCollection<Portfolio>>
		getItemsForPortfolio(portfolio_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<AsanaResource>>
		createPortfolio(
			body: { data: { name: string; workspace: string } },
			opts?: OptionalFields,
		): Promise<AsanaResponse<Portfolio>>
		updatePortfolio(
			body: { data: { name?: string | undefined } },
			portfolio_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Portfolio>>
		deletePortfolio(portfolio_gid: string): Promise<EmptyResponse>
	}

	interface GoalRequest {
		name?: string | undefined
		workspace?: string | undefined
		notes?: string | undefined
		html_notes?: string | undefined
		due_on?: string | null | undefined
		start_on?: string | null | undefined
	}

	interface GoalsApi {
		getGoal(goal_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Goal>>
		getGoals(opts?: PaginationOptions & { workspace?: string | undefined }): Promise<AsanaCollection<Goal>>
		createGoal(body: { data: GoalRequest }, opts?: OptionalFields): Promise<AsanaResponse<Goal>>
		updateGoal(body: { data: GoalRequest }, goal_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Goal>>
		deleteGoal(goal_gid: string): Promise<EmptyResponse>
	}

	interface CustomFieldsApi {
		getCustomField(custom_field_gid: string, opts?: OptionalFields): Promise<AsanaResponse<CustomField>>
		getCustomFieldsForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<CustomField>>
	}

	interface CustomFieldSettingsApi {
		getCustomFieldSettingsForGoal(
			goal_gid: string,
			opts?: PaginationOptions,
		): Promise<AsanaCollection<CustomFieldSetting>>
		getCustomFieldSettingsForPortfolio(
			portfolio_gid: string,
			opts?: PaginationOptions,
		): Promise<AsanaCollection<CustomFieldSetting>>
		getCustomFieldSettingsForProject(
			project_gid: string,
			opts?: PaginationOptions,
		): Promise<AsanaCollection<CustomFieldSetting>>
		getCustomFieldSettingsForTeam(
			team_gid: string,
			opts?: PaginationOptions,
		): Promise<AsanaCollection<CustomFieldSetting>>
	}

	interface AIStudioUsageAPIApi {
		getAiStudioRuns(
			workspace_gid: string,
			opts?: PaginationOptions & {
				start_at?: string | undefined
				end_at?: string | undefined
				division_gid?: string | undefined
			},
		): Promise<AsanaCollection<AiStudioRecord>>
		getAiStudioSeats(
			workspace_gid: string,
			opts?: PaginationOptions & { state?: string | undefined; division_gid?: string | undefined },
		): Promise<AsanaCollection<AiStudioRecord>>
	}

	interface TagRequest {
		name?: string | undefined
		color?: string | null | undefined
		notes?: string | undefined
	}

	interface TeamsApi {
		getTeam(team_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Team>>
		getTeamsForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Team>>
	}

	interface UserTaskListsApi {
		getUserTaskListForUser(
			user_gid: string,
			workspace: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<UserTaskList>>
	}

	interface TagsApi {
		createTagForWorkspace(
			body: { data: TagRequest },
			workspace_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Tag>>
		updateTag(body: { data: TagRequest }, tag_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
		deleteTag(tag_gid: string): Promise<EmptyResponse>
		getTagsForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Tag>>
		getTag(tag_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
		getTagsForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollection<Tag>>
	}

	interface ProjectRequest {
		name?: string | undefined
		workspace?: string | undefined
		archived?: boolean | undefined
		owner?: string | null | undefined
		notes?: string | undefined
		html_notes?: string | undefined
		color?: string | undefined
		privacy_setting?: 'public_to_workspace' | 'private' | 'private_to_team' | undefined
		default_view?: 'list' | 'board' | 'calendar' | 'timeline' | undefined
		default_access_level?: 'admin' | 'editor' | 'commenter' | 'viewer' | undefined
		due_on?: string | null | undefined
		start_on?: string | null | undefined
	}

	interface TaskCounts {
		num_tasks?: number | undefined
		num_incomplete_tasks?: number | undefined
		num_completed_tasks?: number | undefined
		num_milestones?: number | undefined
		num_incomplete_milestones?: number | undefined
		num_completed_milestones?: number | undefined
	}

	interface ProjectsApi {
		createProject(body: { data: ProjectRequest }, opts?: OptionalFields): Promise<AsanaResponse<Project>>
		updateProject(
			body: { data: ProjectRequest },
			project_gid: string,
			opts?: OptionalFields,
		): Promise<AsanaResponse<Project>>
		deleteProject(project_gid: string): Promise<EmptyResponse>
		getProjects(
			opts?: PaginationOptions & {
				workspace?: string | undefined
				team?: string | undefined
				archived?: boolean | undefined
				custom_type?: string | undefined
			},
		): Promise<AsanaCollection<Project>>
		getTaskCountsForProject(project_gid: string, opts?: OptionalFields): Promise<AsanaResponse<TaskCounts>>
		/** Filters are dotted query keys such as `'teams.any'` or `'due_on.before'`. */
		searchProjectsForWorkspace(
			workspace_gid: string,
			opts?: OptionalFields & { limit?: number | undefined } & Record<string, string | number | boolean | undefined>,
		): Promise<AsanaCollection<Project>>
		getProject(project_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Project>>
		getProjectsForWorkspace(
			workspace_gid: string,
			opts?: PaginationOptions & { archived?: boolean | undefined },
		): Promise<AsanaCollection<Project>>
	}
}

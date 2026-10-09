import 'asana'

/**
 * Augments the `asana` SDK, whose generated declarations type every request and
 * response as `any`. Each shape here is pinned by `asana.learn.test.ts`.
 *
 * The block below is migrated in slices: a type moves out of the commented
 * legacy sketch at the bottom only together with the learning test that proves it.
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
		projects?: Project[] | undefined
		tags?: Tag[] | undefined
		workspace?: Workspace | undefined
	}

	interface User extends AsanaResource {
		email?: string | undefined
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
		color?: string | undefined
	}

	interface Workspace extends AsanaResource {
		is_organization?: boolean | undefined
	}

	interface TasksApi {
		getTask(task_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Task>>
	}

	interface ProjectsApi {
		getProject(project_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Project>>
	}
}

// declare module 'asana' {
// 	interface Authentication {
// 		type: string
// 		accessToken?: string
// 	}

// 	interface Authentications {
// 		[key: string]: Authentication
// 	}

// 	class ApiClient {
// 		static instance: ApiClient
// 		authentications: Authentications
// 	}

// 	// Common interfaces
// 	interface AsanaResource {
// 		gid: string
// 		name: string
// 		resource_type: 'custom_field' | (string & {})
// 		created_by?: { gid: string; name: string; resource_type: 'user' } | undefined
// 	}

// 	interface AsanaResponse<T> {
// 		data: T
// 	}

// 	interface AsanaCollectionResponse<T> extends AsanaResponse<T[]> {
// 		next_page?:
// 			| {
// 					offset: string
// 					path: string
// 					uri: string
// 			  }
// 			| undefined
// 	}

// 	interface OptionalFields {
// 		opt_fields?: string | undefined
// 	}

// 	interface PaginationOptions extends OptionalFields {
// 		limit?: number | undefined
// 		offset?: string | undefined
// 	}

// 	// Resource interfaces
// 	interface Task extends AsanaResource {
// 		actual_time_minutes?: number | undefined
// 		approval_status?: string | undefined
// 		assignee?: User | undefined
// 		assignee_section?: Section | undefined
// 		assignee_status?: string | undefined
// 		completed?: boolean | undefined
// 		completed_at?: string | undefined
// 		completed_by?: User | undefined
// 		created_at?: string | undefined
// 		custom_fields?: CustomField[] | undefined
// 		dependencies?: Task[] | undefined
// 		dependents?: Task[] | undefined
// 		due_at?: string | undefined
// 		due_on?: string | undefined
// 		external?: any | undefined
// 		followers?: User[] | undefined
// 		hearted?: boolean | undefined
// 		hearts?: any[] | undefined
// 		html_notes?: string | undefined
// 		liked?: boolean | undefined
// 		likes?: any[] | undefined
// 		memberships?: any[] | undefined
// 		modified_at?: string | undefined
// 		notes?: string | undefined
// 		num_hearts?: number | undefined
// 		num_likes?: number | undefined
// 		num_subtasks?: number | undefined
// 		parent?: Task | undefined
// 		permalink_url?: string | undefined
// 		projects?: Project[] | undefined
// 		resource_subtype?: string | undefined
// 		start_at?: string | undefined
// 		start_on?: string | undefined
// 		tags?: Tag[] | undefined
// 		workspace?: Workspace | undefined
// 	}

// 	interface User extends AsanaResource {
// 		email?: string | undefined
// 		photo?: any | undefined
// 		workspaces?: Workspace[] | undefined
// 	}

// 	interface Project extends AsanaResource {
// 		archived?: boolean | undefined
// 		color?: string | undefined
// 		completed?: boolean | undefined
// 		completed_at?: string | undefined
// 		completed_by?: User | undefined
// 		created_at?: string | undefined
// 		current_status?: any | undefined
// 		custom_field_settings?: any[] | undefined
// 		custom_fields?: CustomField[] | undefined
// 		default_view?: string | undefined
// 		due_date?: string | undefined
// 		due_on?: string | undefined
// 		followers?: User[] | undefined
// 		html_notes?: string | undefined
// 		icon?: string | undefined
// 		members?: User[] | undefined
// 		modified_at?: string | undefined
// 		notes?: string | undefined
// 		owner?: User | undefined
// 		permalink_url?: string | undefined
// 		public?: boolean | undefined
// 		start_on?: string | undefined
// 		team?: Team | undefined
// 		workspace?: Workspace | undefined
// 	}

// 	interface Section extends AsanaResource {
// 		created_at?: string | undefined
// 		project?: Project | undefined
// 		projects?: Project[] | undefined
// 	}

// 	interface Workspace extends AsanaResource {
// 		email_domains?: string[] | undefined
// 		is_organization?: boolean | undefined
// 	}

// 	interface Team extends AsanaResource {
// 		description?: string | undefined
// 		html_description?: string | undefined
// 		organization?: Workspace | undefined
// 		permalink_url?: string | undefined
// 		visibility?: string | undefined
// 	}

// 	interface Tag extends AsanaResource {
// 		color?: string | undefined
// 		followers?: User[] | undefined
// 		notes?: string | undefined
// 		permalink_url?: string | undefined
// 		workspace?: Workspace | undefined
// 	}

// 	interface TeamMembership extends AsanaResource {
// 		resource_type: 'team_membership'
// 		user?:
// 			| {
// 					gid: string
// 					resource_type: 'user'
// 					name: string
// 			  }
// 			| undefined
// 		team?:
// 			| {
// 					gid: string
// 					resource_type: 'team'
// 					name: string
// 			  }
// 			| undefined
// 		is_guest?: boolean | undefined
// 		is_limited_access?: boolean | undefined
// 		is_admin?: boolean | undefined
// 	}

// 	interface EnumOption {
// 		gid: string
// 		name: string
// 		color?: string | undefined
// 		enabled?: boolean | undefined
// 		resource_type?: 'enum_option' | (string & {}) | undefined
// 	}

// 	interface UserReference {
// 		gid: string
// 		name: string
// 		resource_type: 'user'
// 		custom_fields?: CustomField[] | undefined
// 	}

// 	interface CustomField extends AsanaResource {
// 		currency_code?: string | undefined
// 		custom_label?: string | undefined
// 		custom_label_position?: string | undefined
// 		description?: string | undefined
// 		enabled?: boolean | undefined
// 		multi_enum_values?: EnumOption[] | undefined
// 		enum_options?: EnumOption[] | undefined
// 		enum_value?: EnumOption | undefined
// 		people_value?: UserReference[] | undefined
// 		format?: string | undefined
// 		has_notifications_enabled?: boolean | undefined
// 		is_global_to_workspace?: boolean | undefined
// 		number_value?: number | undefined
// 		precision?: number | undefined
// 		privacy_setting?: 'public_with_guests' | undefined
// 		default_access_level?: 'admin' | undefined
// 		asana_created_field?: boolean | null | undefined
// 		is_formula_field?: boolean | undefined
// 		reference_value?:
// 			| {
// 					gid: string
// 					name: string
// 					resource_type: 'project' | 'section' | 'tag' | 'user' | 'team' | 'workspace'
// 			  }[]
// 			| undefined
// 		id_prefix?: null | undefined
// 		representation_type?: 'multi_enum' | undefined
// 		text_value?: string | undefined
// 		type?: 'multi_enum' | (string & {}) | undefined
// 	}

// 	interface MultiEnumField extends CustomField {}

// 	interface Portfolio extends AsanaResource {
// 		color?: string | undefined
// 		created_at?: string | undefined
// 		custom_field_settings?: any[] | undefined
// 		custom_fields?: CustomField[] | undefined
// 		members?: User[] | undefined
// 		owner?: User | undefined
// 		permalink_url?: string | undefined
// 		public?: boolean | undefined
// 		workspace?: Workspace | undefined
// 	}

// 	interface Attachment extends AsanaResource {
// 		created_at?: string | undefined
// 		download_url?: string | undefined
// 		host?: string | undefined
// 		parent?: AsanaResource | undefined
// 		permanent_url?: string | undefined
// 		size?: number | undefined
// 		url?: string
// 		view_url?: string
// 	}

// 	interface Story extends AsanaResource {
// 		created_at?: string | undefined
// 		html_text?: string | undefined
// 		is_editable?: boolean | undefined
// 		is_edited?: boolean | undefined
// 		is_pinned?: boolean | undefined
// 		sticker_name?:
// 			| 'green_checkmark'
// 			| 'people_dancing'
// 			| 'dancing_unicorn'
// 			| 'heart'
// 			| 'party_popper'
// 			| 'people_waving_flags'
// 			| 'splashing_narwhal'
// 			| 'trophy'
// 			| 'yeti_riding_unicorn'
// 			| 'celebrating_people'
// 			| 'determined_climbers'
// 			| 'phoenix_spreading_love'
// 		target?: AsanaResource | undefined
// 		text?: string | undefined
// 		type?: 'comment' | 'system' | undefined
// 	}

// 	interface CustomFieldSetting extends AsanaResource {
// 		custom_field?: CustomField | undefined
// 		is_important?: boolean | undefined
// 		parent?: AsanaResource | undefined
// 		project?: Project | undefined
// 		portfolio?: Portfolio | undefined
// 	}
// 	interface TaskOptions extends PaginationOptions {
// 		assignee?: string | undefined
// 		project?: string | undefined
// 		section?: string | undefined
// 		workspace?: string | undefined
// 		completed_since?: string | undefined
// 		modified_since?: string | undefined
// 	}
// 	interface TaskRequest {
// 		// Base properties from TaskCompact
// 		name?: string | undefined
// 		resource_subtype?: 'default_task' | 'milestone' | 'approval' | undefined

// 		// Properties from TaskBase
// 		approval_status?: 'pending' | 'approved' | 'rejected' | 'changes_requested' | undefined
// 		assignee_status?: 'today' | 'upcoming' | 'later' | 'new' | 'inbox' | undefined
// 		completed?: boolean | undefined
// 		due_at?: string | undefined
// 		due_on?: string | undefined
// 		external?: { gid?: string; data?: string } | undefined
// 		html_notes?: string | undefined
// 		notes?: string | undefined
// 		start_at?: string | undefined
// 		start_on?: string | undefined

// 		// Request-specific properties
// 		assignee?: string | undefined
// 		assignee_section?: string | undefined
// 		custom_fields?: Record<string, string | number | Array<string> | Record<string, string> | null> | undefined
// 		followers?: string[] | undefined
// 		parent?: string | undefined
// 		projects?: string[] | undefined
// 		tags?: string[] | undefined
// 		workspace?: string | undefined
// 		custom_type?: string | undefined
// 		custom_type_status_option?: string | undefined
// 	}

// 	// API Classes
// 	export class TasksApi {
// 		// Task CRUD operations
// 		createTask(body: { data: Partial<TaskRequest> }, opts?: OptionalFields): Promise<AsanaResponse<Task>>
// 		getTask(task_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Task>>
// 		getTasks(opts?: TaskOptions): Promise<AsanaCollectionResponse<Task>>
// 		updateTask(
// 			body: { data: Partial<TaskRequest> },
// 			task_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Task>>
// 		deleteTask(task_gid: string): Promise<AsanaResponse<{}>>

// 		// Task relationships
// 		getTasksForProject(project_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>
// 		getTasksForSection(section_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>
// 		getTasksForTag(tag_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>
// 		getTasksForUserTaskList(
// 			user_task_list_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<Task>>
// 		getTaskForCustomID(workspace_gid: string, custom_id: string, opts?: OptionalFields): Promise<AsanaResponse<Task>>

// 		// Subtasks
// 		createSubtaskForTask(
// 			body: { data: TaskRequest },
// 			task_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Task>>
// 		getSubtasksForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>
// 		setParentForTask(
// 			body: { data: { parent: string } },
// 			task_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Task>>

// 		// Dependencies
// 		addDependenciesForTask(
// 			task_gid: string,
// 			body: { dependencies: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeDependenciesForTask(
// 			task_gid: string,
// 			body: { dependencies: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		getDependenciesForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>
// 		addDependentsForTask(
// 			task_gid: string,
// 			body: { dependents: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeDependentsForTask(
// 			task_gid: string,
// 			body: { dependents: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		getDependentsForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Task>>

// 		// Projects and Tags
// 		addProjectForTask(
// 			body: { data: { project: string; section?: string; insert_before?: string; insert_after?: string } },
// 			task_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeProjectForTask(task_gid: string, body: { project: string }, opts?: OptionalFields): Promise<AsanaResponse<{}>>
// 		addTagForTask(task_gid: string, body: { tag: string }, opts?: OptionalFields): Promise<AsanaResponse<{}>>
// 		removeTagForTask(task_gid: string, body: { tag: string }, opts?: OptionalFields): Promise<AsanaResponse<{}>>

// 		// Followers
// 		addFollowersForTask(
// 			task_gid: string,
// 			body: { followers: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeFollowerForTask(
// 			task_gid: string,
// 			body: { followers: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>

// 		// Other operations
// 		duplicateTask(
// 			task_gid: string,
// 			body: { name: string; include?: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Task>>
// 		searchTasksForWorkspace(
// 			workspace_gid: string,
// 			opts?: PaginationOptions & {
// 				text?: string
// 				assignee?: string
// 				projects?: string[]
// 				tags?: string[]
// 				completed?: boolean
// 			}
// 		): Promise<AsanaCollectionResponse<Task>>
// 	}

// 	export class ProjectsApi {
// 		// Project CRUD operations
// 		createProject(body: Partial<Project>, opts?: OptionalFields): Promise<AsanaResponse<Project>>
// 		createProjectForTeam(
// 			team_gid: string,
// 			body: Partial<Project>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Project>>
// 		createProjectForWorkspace(
// 			workspace_gid: string,
// 			body: Partial<Project>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Project>>
// 		getProject(project_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Project>>
// 		getProjects(
// 			opts?: PaginationOptions & { workspace?: string; team?: string; archived?: boolean }
// 		): Promise<AsanaCollectionResponse<Project>>
// 		getProjectsForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Project>>
// 		getProjectsForTeam(
// 			team_gid: string,
// 			opts?: PaginationOptions & { archived?: boolean }
// 		): Promise<AsanaCollectionResponse<Project>>
// 		getProjectsForWorkspace(
// 			workspace_gid: string,
// 			opts?: PaginationOptions & { archived?: boolean }
// 		): Promise<AsanaCollectionResponse<Project>>
// 		updateProject(project_gid: string, body: Partial<Project>, opts?: OptionalFields): Promise<AsanaResponse<Project>>
// 		deleteProject(project_gid: string): Promise<AsanaResponse<{}>>

// 		// Project operations
// 		duplicateProject(
// 			project_gid: string,
// 			body: { name: string; include?: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Project>>
// 		projectSaveAsTemplate(
// 			project_gid: string,
// 			body: { name: string; public?: boolean },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 		getTaskCountsForProject(project_gid: string, opts?: OptionalFields): Promise<AsanaResponse<any>>

// 		// Project membership
// 		addMembersForProject(
// 			project_gid: string,
// 			body: { members: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeMembersForProject(
// 			project_gid: string,
// 			body: { members: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		addFollowersForProject(
// 			project_gid: string,
// 			body: { followers: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeFollowersForProject(
// 			project_gid: string,
// 			body: { followers: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>

// 		// Custom fields
// 		addCustomFieldSettingForProject(
// 			project_gid: string,
// 			body: { custom_field: string; is_important?: boolean; insert_before?: string; insert_after?: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 		removeCustomFieldSettingForProject(
// 			project_gid: string,
// 			body: { custom_field: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 	}

// 	export class SectionsApi {
// 		// Section CRUD operations
// 		createSectionForProject(
// 			project_gid: string,
// 			body: Partial<Section>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Section>>
// 		getSection(section_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Section>>
// 		getSectionsForProject(project_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Section>>
// 		updateSection(section_gid: string, body: Partial<Section>, opts?: OptionalFields): Promise<AsanaResponse<Section>>
// 		deleteSection(section_gid: string): Promise<AsanaResponse<{}>>

// 		// Section operations
// 		insertSectionForProject(
// 			project_gid: string,
// 			body: { name: string; before_section?: string; after_section?: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Section>>
// 		addTaskForSection(
// 			section_gid: string,
// 			body: { task: string; insert_before?: string; insert_after?: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 	}

// 	export class UsersApi {
// 		// User operations
// 		getUser(user_gid: string, opts?: OptionalFields): Promise<AsanaResponse<User>>
// 		getUsers(opts?: PaginationOptions & { workspace?: string; team?: string }): Promise<AsanaCollectionResponse<User>>
// 		getUsersForTeam(team_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<UserReference>>
// 		getUsersForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<User>>
// 		getFavoritesForUser(
// 			user_gid: string,
// 			opts?: PaginationOptions & { resource_type?: string; workspace?: string }
// 		): Promise<AsanaCollectionResponse<AsanaResource>>
// 	}

// 	export class WorkspacesApi {
// 		// Workspace operations
// 		getWorkspace(workspace_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Workspace>>
// 		getWorkspaces(opts?: PaginationOptions): Promise<AsanaCollectionResponse<Workspace>>
// 		updateWorkspace(
// 			workspace_gid: string,
// 			body: Partial<Workspace>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Workspace>>

// 		// Workspace membership
// 		addUserForWorkspace(
// 			workspace_gid: string,
// 			body: { user: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<User>>
// 		removeUserForWorkspace(
// 			workspace_gid: string,
// 			body: { user: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>

// 		// Events
// 		getWorkspaceEvents(
// 			workspace_gid: string,
// 			opts?: PaginationOptions & { resource?: string; sync?: string }
// 		): Promise<AsanaResponse<any>>
// 	}

// 	export class RulesApi {
// 		// Rule CRUD operations
// 		triggerRule(body: { data: any }, rule_gid: string): Promise<AsanaResponse<unknown>>
// 	}
// 	export class TeamsApi {
// 		// Team CRUD operations
// 		createTeam(body: Partial<Team>, opts?: OptionalFields): Promise<AsanaResponse<Team>>
// 		getTeam(team_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Team>>
// 		getTeamsForUser(
// 			user_gid: string,
// 			opts?: PaginationOptions & { organization?: string }
// 		): Promise<AsanaCollectionResponse<Team>>
// 		getTeamsForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Team>>
// 		updateTeam(team_gid: string, body: Partial<Team>, opts?: OptionalFields): Promise<AsanaResponse<Team>>

// 		// Team membership
// 		addUserForTeam(
// 			body: { data: { user: string } },
// 			team_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<User>>
// 		removeUserForTeam(
// 			body: { data: { user: string } },
// 			team_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 	}

// 	export class TeamMembershipsApi {
// 		// Team membership operations
// 		getTeamMembership(team_membership_gid: string, opts?: OptionalFields): Promise<AsanaResponse<TeamMembership>>
// 		getTeamMemberships(opts?: PaginationOptions): Promise<AsanaCollectionResponse<TeamMembership>>
// 		getTeamMembershipsForTeam(
// 			team_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<TeamMembership>>
// 		getTeamMembershipsForUser(
// 			user_gid: string,
// 			workspace_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<TeamMembership>>
// 	}

// 	export class TagsApi {
// 		// Tag CRUD operations
// 		createTag(body: Partial<Tag>, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
// 		createTagForWorkspace(workspace_gid: string, body: Partial<Tag>, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
// 		getTag(tag_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
// 		getTags(opts?: PaginationOptions & { workspace?: string | undefined }): Promise<AsanaCollectionResponse<Tag>>
// 		getTagsForTask(task_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Tag>>
// 		getTagsForWorkspace(workspace_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Tag>>
// 		updateTag(tag_gid: string, body: Partial<Tag>, opts?: OptionalFields): Promise<AsanaResponse<Tag>>
// 		deleteTag(tag_gid: string): Promise<AsanaResponse<{}>>
// 	}

// 	export class PortfoliosApi {
// 		// Portfolio CRUD operations
// 		createPortfolio(body: Partial<Portfolio>, opts?: OptionalFields): Promise<AsanaResponse<Portfolio>>
// 		getPortfolio(portfolio_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Portfolio>>
// 		getPortfolios(
// 			opts?: PaginationOptions & { workspace?: string | undefined; owner?: string | undefined }
// 		): Promise<AsanaCollectionResponse<Portfolio>>
// 		updatePortfolio(
// 			portfolio_gid: string,
// 			body: Partial<Portfolio>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Portfolio>>
// 		deletePortfolio(portfolio_gid: string): Promise<AsanaResponse<{}>>

// 		// Portfolio items
// 		addItemForPortfolio(
// 			portfolio_gid: string,
// 			body: { item: string; insert_before?: string | undefined; insert_after?: string | undefined },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeItemForPortfolio(
// 			portfolio_gid: string,
// 			body: { item: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		getItemsForPortfolio(portfolio_gid: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Project>>

// 		// Portfolio membership
// 		addMembersForPortfolio(
// 			portfolio_gid: string,
// 			body: { members: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 		removeMembersForPortfolio(
// 			portfolio_gid: string,
// 			body: { members: string[] },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>

// 		// Custom fields
// 		addCustomFieldSettingForPortfolio(
// 			portfolio_gid: string,
// 			body: {
// 				custom_field: string
// 				is_important?: boolean | undefined
// 				insert_before?: string | undefined
// 				insert_after?: string | undefined
// 			},
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 		removeCustomFieldSettingForPortfolio(
// 			portfolio_gid: string,
// 			body: { custom_field: string },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<{}>>
// 	}

// 	export class AttachmentsApi {
// 		// Attachment operations
// 		createAttachmentForObject(
// 			body: { file: File | Buffer; parent: string; name?: string | undefined },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Attachment>>
// 		getAttachment(attachment_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Attachment>>
// 		getAttachmentsForObject(parent: string, opts?: PaginationOptions): Promise<AsanaCollectionResponse<Attachment>>
// 		deleteAttachment(attachment_gid: string): Promise<AsanaResponse<{}>>
// 	}

// 	export class CustomFieldsApi {
// 		// Custom field operations
// 		createCustomField(body: Partial<CustomField>, opts?: OptionalFields): Promise<AsanaResponse<CustomField>>
// 		/**
// 		 *
// 		 *
// 		 * @param custom_field_gid
// 		 * @param opts.opt_fields csv of:
// 		 * - asana_created_field
// 		 * - created_by
// 		 * - created_by.name
// 		 * - currency_code
// 		 * - custom_label
// 		 * - custom_label_position
// 		 * - date_value
// 		 * - date_value.date
// 		 * - date_value.date_time
// 		 */
// 		getCustomField<T extends CustomField>(custom_field_gid: string, opts?: OptionalFields): Promise<AsanaResponse<T>>
// 		getCustomFieldsForWorkspace<T extends CustomField>(
// 			workspace_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<T>>
// 		updateCustomField(
// 			custom_field_gid: string,
// 			body: Partial<CustomField>,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<CustomField>>
// 		deleteCustomField(custom_field_gid: string): Promise<AsanaResponse<{}>>

// 		// Enum options
// 		createEnumOptionForCustomField(
// 			custom_field_gid: string,
// 			body: { name: string; color?: string | undefined; enabled?: boolean | undefined },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 		insertEnumOptionForCustomField(
// 			custom_field_gid: string,
// 			body: {
// 				name: string
// 				color?: string | undefined
// 				enabled?: boolean | undefined
// 				before_enum_option?: string | undefined
// 				after_enum_option?: string | undefined
// 			},
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 		updateEnumOption(
// 			enum_option_gid: string,
// 			body: { name?: string | undefined; color?: string | undefined; enabled?: boolean | undefined },
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<any>>
// 	}

// 	export class EventsApi {
// 		// Event operations
// 		getEvents(resource: string, opts?: OptionalFields & { sync?: string | undefined }): Promise<AsanaResponse<any>>
// 	}

// 	export class StoriesApi {
// 		// Story CRUD operations
// 		createStoryForTask(
// 			body: {
// 				data: {
// 					text?: string | undefined
// 					html_text?: string | undefined
// 					is_pinned?: boolean | undefined
// 					sticker_name?: Story['sticker_name'] | undefined
// 				}
// 			},
// 			task_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<Story>>
// 		getStory(story_gid: string, opts?: OptionalFields): Promise<AsanaResponse<Story>>
// 		getStoriesForTask(task_gid: string, opts?: PaginationOptions | undefined): Promise<AsanaCollectionResponse<Story>>
// 		updateStory(
// 			story_gid: string,
// 			body: { text?: string | undefined; html_text?: string | undefined; is_pinned?: boolean | undefined },
// 			opts?: OptionalFields | undefined
// 		): Promise<AsanaResponse<Story>>
// 		deleteStory(story_gid: string): Promise<AsanaResponse<{}>>
// 	}

// 	export class CustomFieldSettingsApi {
// 		// Custom field settings operations
// 		getCustomFieldSetting(
// 			custom_field_setting_gid: string,
// 			opts?: OptionalFields
// 		): Promise<AsanaResponse<CustomFieldSetting>>
// 		getCustomFieldSettingsForProject(
// 			project_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<CustomFieldSetting>>
// 		getCustomFieldSettingsForPortfolio(
// 			portfolio_gid: string,
// 			opts?: PaginationOptions
// 		): Promise<AsanaCollectionResponse<CustomFieldSetting>>
// 	}
// }

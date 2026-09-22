import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Command } from 'commander'
import { type AttachmentApi, createAttachmentApi } from './attachments/api.js'
import { attachmentCommand } from './attachments/cli.js'
import { createAsanaAttachmentGateway } from './attachments/gateway.js'
import { registerAttachmentTools } from './attachments/mcp.js'
import { authCommand } from './auth/cli.js'
import { createClient } from './client.js'
import { configCommand } from './config-cli.js'
import { type CustomFieldApi, createCustomFieldApi } from './custom-fields/api.js'
import { customFieldCommand } from './custom-fields/cli.js'
import { createAsanaCustomFieldGateway } from './custom-fields/gateway.js'
import { registerCustomFieldTools } from './custom-fields/mcp.js'
import { createEventApi, type EventApi } from './events/api.js'
import { eventCommand } from './events/cli.js'
import { createAsanaEventGateway } from './events/gateway.js'
import { registerEventTools } from './events/mcp.js'
import { createGoalApi, type GoalApi } from './goals/api.js'
import { goalCommand } from './goals/cli.js'
import { createAsanaGoalGateway } from './goals/gateway.js'
import { registerGoalTools } from './goals/mcp.js'
import { createJobApi, type JobApi } from './jobs/api.js'
import { jobCommand } from './jobs/cli.js'
import { createAsanaJobGateway } from './jobs/gateway.js'
import { registerJobTools } from './jobs/mcp.js'
import { mcpCommand } from './mcp-cli.js'
import { createMembershipApi, type MembershipApi } from './memberships/api.js'
import { membershipCommand } from './memberships/cli.js'
import { createAsanaMembershipGateway } from './memberships/gateway.js'
import { registerMembershipTools } from './memberships/mcp.js'
import { createOooApi, type OooApi } from './ooo/api.js'
import { oooCommand } from './ooo/cli.js'
import { createAsanaOooGateway } from './ooo/gateway.js'
import { registerOooTools } from './ooo/mcp.js'
import { createPortfolioApi, type PortfolioApi } from './portfolios/api.js'
import { portfolioCommand } from './portfolios/cli.js'
import { createAsanaPortfolioGateway } from './portfolios/gateway.js'
import { registerPortfolioTools } from './portfolios/mcp.js'
import { createProjectTemplateApi, type ProjectTemplateApi } from './project-templates/api.js'
import { projectTemplateCommand } from './project-templates/cli.js'
import { createAsanaProjectTemplateGateway } from './project-templates/gateway.js'
import { registerProjectTemplateTools } from './project-templates/mcp.js'
import { createProjectApi, type ProjectApi } from './projects/api.js'
import { projectCommand } from './projects/cli.js'
import { createAsanaProjectGateway } from './projects/gateway.js'
import { registerProjectTools } from './projects/mcp.js'
import { createRuleApi, type RuleApi } from './rules/api.js'
import { ruleCommand } from './rules/cli.js'
import { createAsanaRuleGateway } from './rules/gateway.js'
import { registerRuleTools } from './rules/mcp.js'
import { createSearchApi, type SearchApi } from './search/api.js'
import { searchCommand } from './search/cli.js'
import { createAsanaSearchGateway } from './search/gateway.js'
import { registerSearchTools } from './search/mcp.js'
import { createSectionApi, type SectionApi } from './sections/api.js'
import { sectionCommand } from './sections/cli.js'
import { createAsanaSectionGateway } from './sections/gateway.js'
import { registerSectionTools } from './sections/mcp.js'
import { setupCommand } from './setup-cli.js'
import { createStatusApi, type StatusApi } from './status/api.js'
import { statusCommand } from './status/cli.js'
import { createAsanaStatusGateway } from './status/gateway.js'
import { registerStatusTools } from './status/mcp.js'
import { createStoryApi, type StoryApi } from './stories/api.js'
import { storyCommand } from './stories/cli.js'
import { createAsanaStoryGateway } from './stories/gateway.js'
import { registerStoryTools } from './stories/mcp.js'
import { createTagApi, type TagApi } from './tags/api.js'
import { tagCommand } from './tags/cli.js'
import { createAsanaTagGateway } from './tags/gateway.js'
import { registerTagTools } from './tags/mcp.js'
import { createTaskTemplateApi, type TaskTemplateApi } from './task-templates/api.js'
import { taskTemplateCommand } from './task-templates/cli.js'
import { createAsanaTaskTemplateGateway } from './task-templates/gateway.js'
import { registerTaskTemplateTools } from './task-templates/mcp.js'
import { createTaskApi, type TaskApi } from './tasks/api.js'
import { taskCommand } from './tasks/cli.js'
import { createAsanaTaskGateway } from './tasks/gateway.js'
import { registerTaskTools } from './tasks/mcp.js'
import { createTeamApi, type TeamApi } from './teams/api.js'
import { teamCommand } from './teams/cli.js'
import { createAsanaTeamGateway } from './teams/gateway.js'
import { registerTeamTools } from './teams/mcp.js'
import { urlCommand } from './url-cli.js'
import { registerUrlTools } from './url-mcp.js'
import { createUserApi, type UserApi } from './users/api.js'
import { userCommand } from './users/cli.js'
import { createAsanaUserGateway } from './users/gateway.js'
import { registerUserTools } from './users/mcp.js'
import { createWorkspaceApi, type WorkspaceApi } from './workspaces/api.js'
import { workspaceCommand } from './workspaces/cli.js'
import { createAsanaWorkspaceGateway } from './workspaces/gateway.js'
import { registerWorkspaceTools } from './workspaces/mcp.js'

export type RuntimeContext = {
	attachments: AttachmentApi
	customFields: CustomFieldApi
	events: EventApi
	goals: GoalApi
	memberships: MembershipApi
	ooo: OooApi
	jobs: JobApi
	portfolios: PortfolioApi
	projects: ProjectApi
	projectTemplates: ProjectTemplateApi
	rules: RuleApi
	search: SearchApi
	sections: SectionApi
	status: StatusApi
	stories: StoryApi
	tags: TagApi
	tasks: TaskApi
	taskTemplates: TaskTemplateApi
	teams: TeamApi
	users: UserApi
	workspaces: WorkspaceApi
}

export function createRuntimeContext(): RuntimeContext {
	const client = createClient()
	const portfolioGateway = createAsanaPortfolioGateway(client)
	const projectGateway = createAsanaProjectGateway(client)
	const jobGateway = createAsanaJobGateway(client)
	return {
		attachments: createAttachmentApi(createAsanaAttachmentGateway(client)),
		customFields: createCustomFieldApi(createAsanaCustomFieldGateway(client)),
		events: createEventApi(createAsanaEventGateway(client)),
		goals: createGoalApi(createAsanaGoalGateway(client)),
		memberships: createMembershipApi(createAsanaMembershipGateway(client)),
		ooo: createOooApi(createAsanaOooGateway(client)),
		jobs: createJobApi(jobGateway),
		portfolios: createPortfolioApi(portfolioGateway),
		projects: createProjectApi(projectGateway),
		projectTemplates: createProjectTemplateApi(createAsanaProjectTemplateGateway(client), { jobs: jobGateway }),
		rules: createRuleApi(createAsanaRuleGateway(client)),
		search: createSearchApi(createAsanaSearchGateway(client)),
		sections: createSectionApi(createAsanaSectionGateway(client)),
		status: createStatusApi(createAsanaStatusGateway(client), {
			portfolios: portfolioGateway,
			projects: projectGateway,
		}),
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
		tasks: createTaskApi(createAsanaTaskGateway(client)),
		taskTemplates: createTaskTemplateApi(createAsanaTaskTemplateGateway(client)),
		teams: createTeamApi(createAsanaTeamGateway(client)),
		users: createUserApi(createAsanaUserGateway(client)),
		workspaces: createWorkspaceApi(createAsanaWorkspaceGateway(client)),
	}
}

export function registerCliCommands(program: Command, getContext: () => RuntimeContext) {
	program.addCommand(workspaceCommand(() => getContext().workspaces))
	program.addCommand(projectCommand(() => getContext().projects))
	program.addCommand(taskCommand(() => getContext().tasks))
	program.addCommand(taskTemplateCommand(() => getContext().taskTemplates))
	program.addCommand(sectionCommand(() => getContext().sections))
	program.addCommand(searchCommand(() => getContext().search))
	program.addCommand(userCommand(() => getContext().users))
	program.addCommand(teamCommand(() => getContext().teams))
	program.addCommand(portfolioCommand(() => getContext().portfolios))
	program.addCommand(goalCommand(() => getContext().goals))
	program.addCommand(membershipCommand(() => getContext().memberships))
	program.addCommand(tagCommand(() => getContext().tags))
	program.addCommand(customFieldCommand(() => getContext().customFields))
	program.addCommand(oooCommand(() => getContext().ooo))
	program.addCommand(attachmentCommand(() => getContext().attachments))
	program.addCommand(projectTemplateCommand(() => getContext().projectTemplates))
	program.addCommand(jobCommand(() => getContext().jobs))
	program.addCommand(statusCommand(() => getContext().status))
	program.addCommand(ruleCommand(() => getContext().rules))
	program.addCommand(eventCommand(() => getContext().events))
	program.addCommand(storyCommand('story', () => getContext().stories))
	program.addCommand(storyCommand('comment', () => getContext().stories))
	program.addCommand(authCommand())
	program.addCommand(
		configCommand(
			() => getContext().projects,
			() => getContext().users,
		),
	)
	program.addCommand(setupCommand())
	program.addCommand(urlCommand())
	program.addCommand(mcpCommand(getContext))
}

export function registerMcpTools(server: McpServer, getContext: () => RuntimeContext) {
	registerWorkspaceTools(server, () => getContext().workspaces)
	registerProjectTools(server, () => getContext().projects)
	registerTaskTools(server, () => getContext().tasks)
	registerTaskTemplateTools(server, () => getContext().taskTemplates)
	registerSectionTools(server, () => getContext().sections)
	registerSearchTools(server, () => getContext().search)
	registerUserTools(server, () => getContext().users)
	registerTeamTools(server, () => getContext().teams)
	registerPortfolioTools(server, () => getContext().portfolios)
	registerGoalTools(server, () => getContext().goals)
	registerMembershipTools(server, () => getContext().memberships)
	registerTagTools(server, () => getContext().tags)
	registerCustomFieldTools(server, () => getContext().customFields)
	registerOooTools(server, () => getContext().ooo)
	registerAttachmentTools(server, () => getContext().attachments)
	registerProjectTemplateTools(server, () => getContext().projectTemplates)
	registerJobTools(server, () => getContext().jobs)
	registerStatusTools(server, () => getContext().status)
	registerRuleTools(server, () => getContext().rules)
	registerEventTools(server, () => getContext().events)
	registerStoryTools(server, () => getContext().stories)
	registerUrlTools(server)
}

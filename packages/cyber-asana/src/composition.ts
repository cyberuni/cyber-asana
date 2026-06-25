import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Command } from 'commander'
import { type AttachmentApi, createAttachmentApi } from './attachments/api.js'
import { attachmentCommand } from './attachments/cli.js'
import { createAsanaAttachmentGateway } from './attachments/gateway.js'
import { registerAttachmentTools } from './attachments/mcp.js'
import { createClient } from './client.js'
import { configCommand } from './config-cli.js'
import { createGoalApi, type GoalApi } from './goals/api.js'
import { goalCommand } from './goals/cli.js'
import { createAsanaGoalGateway } from './goals/gateway.js'
import { registerGoalTools } from './goals/mcp.js'
import { mcpCommand } from './mcp-cli.js'
import { createPortfolioApi, type PortfolioApi } from './portfolios/api.js'
import { portfolioCommand } from './portfolios/cli.js'
import { createAsanaPortfolioGateway } from './portfolios/gateway.js'
import { registerPortfolioTools } from './portfolios/mcp.js'
import { createProjectApi, type ProjectApi } from './projects/api.js'
import { projectCommand } from './projects/cli.js'
import { createAsanaProjectGateway } from './projects/gateway.js'
import { registerProjectTools } from './projects/mcp.js'
import { createSectionApi, type SectionApi } from './sections/api.js'
import { sectionCommand } from './sections/cli.js'
import { createAsanaSectionGateway } from './sections/gateway.js'
import { registerSectionTools } from './sections/mcp.js'
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
	goals: GoalApi
	portfolios: PortfolioApi
	projects: ProjectApi
	sections: SectionApi
	status: StatusApi
	stories: StoryApi
	tags: TagApi
	tasks: TaskApi
	teams: TeamApi
	users: UserApi
	workspaces: WorkspaceApi
}

export function createRuntimeContext(): RuntimeContext {
	const client = createClient()
	return {
		attachments: createAttachmentApi(createAsanaAttachmentGateway(client)),
		goals: createGoalApi(createAsanaGoalGateway(client)),
		portfolios: createPortfolioApi(createAsanaPortfolioGateway(client)),
		projects: createProjectApi(createAsanaProjectGateway(client)),
		sections: createSectionApi(createAsanaSectionGateway(client)),
		status: createStatusApi(createAsanaStatusGateway(client)),
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
		tasks: createTaskApi(createAsanaTaskGateway(client)),
		teams: createTeamApi(createAsanaTeamGateway(client)),
		users: createUserApi(createAsanaUserGateway(client)),
		workspaces: createWorkspaceApi(createAsanaWorkspaceGateway(client)),
	}
}

export function registerCliCommands(program: Command, getContext: () => RuntimeContext) {
	program.addCommand(workspaceCommand(() => getContext().workspaces))
	program.addCommand(projectCommand(() => getContext().projects))
	program.addCommand(taskCommand(() => getContext().tasks))
	program.addCommand(sectionCommand(() => getContext().sections))
	program.addCommand(userCommand(() => getContext().users))
	program.addCommand(teamCommand(() => getContext().teams))
	program.addCommand(portfolioCommand(() => getContext().portfolios))
	program.addCommand(goalCommand(() => getContext().goals))
	program.addCommand(tagCommand(() => getContext().tags))
	program.addCommand(attachmentCommand(() => getContext().attachments))
	program.addCommand(statusCommand(() => getContext().status))
	program.addCommand(storyCommand('story', () => getContext().stories))
	program.addCommand(storyCommand('comment', () => getContext().stories))
	program.addCommand(configCommand(() => getContext().projects))
	program.addCommand(urlCommand())
	program.addCommand(mcpCommand(getContext))
}

export function registerMcpTools(server: McpServer, getContext: () => RuntimeContext) {
	registerWorkspaceTools(server, () => getContext().workspaces)
	registerProjectTools(server, () => getContext().projects)
	registerTaskTools(server, () => getContext().tasks)
	registerSectionTools(server, () => getContext().sections)
	registerUserTools(server, () => getContext().users)
	registerTeamTools(server, () => getContext().teams)
	registerPortfolioTools(server, () => getContext().portfolios)
	registerGoalTools(server, () => getContext().goals)
	registerTagTools(server, () => getContext().tags)
	registerAttachmentTools(server, () => getContext().attachments)
	registerStatusTools(server, () => getContext().status)
	registerStoryTools(server, () => getContext().stories)
	registerUrlTools(server)
}

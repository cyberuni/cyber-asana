import { type AttachmentApi, createAttachmentApi } from './attachments/api.js'
import { createAsanaAttachmentGateway } from './attachments/gateway.js'
import { createClient } from './client.js'
import { createGoalApi, type GoalApi } from './goals/api.js'
import { createAsanaGoalGateway } from './goals/gateway.js'
import { createPortfolioApi, type PortfolioApi } from './portfolios/api.js'
import { createAsanaPortfolioGateway } from './portfolios/gateway.js'
import { createProjectApi, type ProjectApi } from './projects/api.js'
import { createAsanaProjectGateway } from './projects/gateway.js'
import { createSectionApi, type SectionApi } from './sections/api.js'
import { createAsanaSectionGateway } from './sections/gateway.js'
import { createStoryApi, type StoryApi } from './stories/api.js'
import { createAsanaStoryGateway } from './stories/gateway.js'
import { createTagApi, type TagApi } from './tags/api.js'
import { createAsanaTagGateway } from './tags/gateway.js'
import { createTaskApi, type TaskApi } from './tasks/api.js'
import { createAsanaTaskGateway } from './tasks/gateway.js'
import { createTeamApi, type TeamApi } from './teams/api.js'
import { createAsanaTeamGateway } from './teams/gateway.js'
import { createUserApi, type UserApi } from './users/api.js'
import { createAsanaUserGateway } from './users/gateway.js'
import { createWorkspaceApi, type WorkspaceApi } from './workspaces/api.js'
import { createAsanaWorkspaceGateway } from './workspaces/gateway.js'

export type RuntimeContext = {
	attachments: AttachmentApi
	goals: GoalApi
	portfolios: PortfolioApi
	projects: ProjectApi
	sections: SectionApi
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
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
		tasks: createTaskApi(createAsanaTaskGateway(client)),
		teams: createTeamApi(createAsanaTeamGateway(client)),
		users: createUserApi(createAsanaUserGateway(client)),
		workspaces: createWorkspaceApi(createAsanaWorkspaceGateway(client)),
	}
}

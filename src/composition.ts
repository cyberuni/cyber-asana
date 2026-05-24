import { createClient } from './client.js'
import { createAttachmentApi, type AttachmentApi } from './attachments/api.js'
import { createAsanaAttachmentGateway } from './attachments/gateway.js'
import { createSectionApi, type SectionApi } from './sections/api.js'
import { createAsanaSectionGateway } from './sections/gateway.js'
import { createStoryApi, type StoryApi } from './stories/api.js'
import { createAsanaStoryGateway } from './stories/gateway.js'
import { createTagApi, type TagApi } from './tags/api.js'
import { createAsanaTagGateway } from './tags/gateway.js'
import { createTeamApi, type TeamApi } from './teams/api.js'
import { createAsanaTeamGateway } from './teams/gateway.js'
import { createUserApi, type UserApi } from './users/api.js'
import { createAsanaUserGateway } from './users/gateway.js'
import { createWorkspaceApi, type WorkspaceApi } from './workspaces/api.js'
import { createAsanaWorkspaceGateway } from './workspaces/gateway.js'

export type RuntimeContext = {
	attachments: AttachmentApi
	sections: SectionApi
	stories: StoryApi
	tags: TagApi
	teams: TeamApi
	users: UserApi
	workspaces: WorkspaceApi
}

export function createRuntimeContext(): RuntimeContext {
	const client = createClient()
	return {
		attachments: createAttachmentApi(createAsanaAttachmentGateway(client)),
		sections: createSectionApi(createAsanaSectionGateway(client)),
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
		teams: createTeamApi(createAsanaTeamGateway(client)),
		users: createUserApi(createAsanaUserGateway(client)),
		workspaces: createWorkspaceApi(createAsanaWorkspaceGateway(client)),
	}
}

import { createClient } from './client.js'
import { createSectionApi, type SectionApi } from './sections/api.js'
import { createAsanaSectionGateway } from './sections/gateway.js'
import { createStoryApi, type StoryApi } from './stories/api.js'
import { createAsanaStoryGateway } from './stories/gateway.js'
import { createTagApi, type TagApi } from './tags/api.js'
import { createAsanaTagGateway } from './tags/gateway.js'
import { createUserApi, type UserApi } from './users/api.js'
import { createAsanaUserGateway } from './users/gateway.js'
import { createWorkspaceApi, type WorkspaceApi } from './workspaces/api.js'
import { createAsanaWorkspaceGateway } from './workspaces/gateway.js'

export type RuntimeContext = {
	sections: SectionApi
	stories: StoryApi
	tags: TagApi
	users: UserApi
	workspaces: WorkspaceApi
}

export function createRuntimeContext(): RuntimeContext {
	const client = createClient()
	return {
		sections: createSectionApi(createAsanaSectionGateway(client)),
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
		users: createUserApi(createAsanaUserGateway(client)),
		workspaces: createWorkspaceApi(createAsanaWorkspaceGateway(client)),
	}
}

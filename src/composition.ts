import { createClient } from './client.js'
import { createStoryApi, type StoryApi } from './stories/api.js'
import { createAsanaStoryGateway } from './stories/gateway.js'
import { createTagApi, type TagApi } from './tags/api.js'
import { createAsanaTagGateway } from './tags/gateway.js'

export type RuntimeContext = {
	stories: StoryApi
	tags: TagApi
}

export function createRuntimeContext(): RuntimeContext {
	const client = createClient()
	return {
		stories: createStoryApi(createAsanaStoryGateway(client)),
		tags: createTagApi(createAsanaTagGateway(client)),
	}
}

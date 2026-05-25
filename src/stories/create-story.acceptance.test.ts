import { describe, expect, it, vi } from 'vitest'
import { createStoryApi } from './api.js'
import { defineStoryCreateAcceptanceSpecs } from './create-story.acceptance.js'
import type { StoryGateway } from './gateway.js'

const taskGid = 'task-test'

function createStoryGatewayDouble(): StoryGateway {
	return {
		listStories: vi.fn(),
		createStory: vi.fn().mockResolvedValue({ gid: 'story1', text: 'Ship it' }),
		getTaskTemplateData: vi.fn(),
	}
}

describe(
	'stories/create acceptance',
	defineStoryCreateAcceptanceSpecs({
		getApi: () => createStoryApi(createStoryGatewayDouble()),
		taskGid,
	}),
)

describe('stories/create acceptance gateway double', () => {
	it('passes validated html_text through the application api', async () => {
		const gateway = createStoryGatewayDouble()
		const api = createStoryApi(gateway)

		await api.createStory(taskGid, { html_text: '<body><strong>Ship it</strong></body>' })

		expect(gateway.createStory).toHaveBeenCalledWith(taskGid, {
			html_text: '<body><strong>Ship it</strong></body>',
		})
	})

	it('does not call the gateway when html_text validation fails', async () => {
		const gateway = createStoryGatewayDouble()
		const api = createStoryApi(gateway)

		await expect(api.createStory(taskGid, { html_text: '<div>bad</div>' })).rejects.toThrow(/body/)

		expect(gateway.createStory).not.toHaveBeenCalled()
	})
})

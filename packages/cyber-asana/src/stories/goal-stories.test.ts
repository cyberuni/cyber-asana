import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStoryApi } from './api.js'
import { storyCommand } from './cli.js'
import { createAsanaStoryGateway } from './gateway.js'
import { registerStoryTools } from './mcp.js'

const story = { gid: 's1', text: 'On track' }

describe('goal stories', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway lists a goal’s stories and posts a story under the goal', async () => {
		const list = vi.spyOn(Asana.StoriesApi.prototype, 'getStoriesForGoal').mockResolvedValue({ data: [story] } as never)
		const create = vi
			.spyOn(Asana.StoriesApi.prototype, 'createStoryForGoal')
			.mockResolvedValue({ data: story } as never)
		const gateway = createAsanaStoryGateway({} as Asana.ApiClient)

		await gateway.listGoalStories('g1', { limit: 5 })
		const created = await gateway.createGoalStory('g1', { text: 'On track' })

		expect(list).toHaveBeenCalledWith('g1', { limit: 5 })
		expect(create).toHaveBeenCalledWith({ data: { text: 'On track' } }, 'g1', {})
		expect(created).toEqual(story)
	})

	it('api validates the story body locally before sending', async () => {
		const gateway = {
			listGoalStories: vi.fn().mockResolvedValue([story]),
			createGoalStory: vi.fn().mockResolvedValue(story),
		}
		const api = createStoryApi(gateway as never)

		await api.listGoalStories('g1', { limit: 1 })
		await api.createGoalStory('g1', { text: 'On track' })
		await expect(api.createGoalStory('g1', { text: 'a', html_text: '<body>a</body>' })).rejects.toThrow()

		expect(gateway.listGoalStories).toHaveBeenCalledWith('g1', { limit: 1 })
		expect(gateway.createGoalStory).toHaveBeenCalledTimes(1)
	})

	async function run(api: Record<string, unknown>, ...argv: string[]) {
		const program = new Command().addCommand(storyCommand('story', api as never))
		await program.parseAsync(['node', 't', 'story', ...argv], { from: 'node' })
	}

	it('story list-goal and create-goal call the goal operations', async () => {
		const listGoalStories = vi.fn().mockResolvedValue([])
		const createGoalStory = vi.fn().mockResolvedValue(story)
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run({ listGoalStories }, 'list-goal', 'g1')
		await run({ createGoalStory }, 'create-goal', 'g1', 'On track', '--pin')

		expect(listGoalStories).toHaveBeenCalledWith('g1', expect.objectContaining({ optFields: expect.any(String) }))
		expect(createGoalStory).toHaveBeenCalledWith('g1', { text: 'On track', is_pinned: true }, undefined)
		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('0 stories found')
	})

	it('MCP asana_story_goal_list and asana_story_goal_create forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = {
			listGoalStories: vi.fn().mockResolvedValue([story]),
			createGoalStory: vi.fn().mockResolvedValue(story),
		}
		registerStoryTools(server as never, api as never)

		await handlers.get('asana_story_goal_list')?.({ goal_gid: 'g1', limit: 5 })
		await handlers.get('asana_story_goal_create')?.({ goal_gid: 'g1', text: 'On track', is_pinned: true })

		expect(api.listGoalStories).toHaveBeenCalledWith('g1', expect.objectContaining({ limit: 5 }))
		expect(api.createGoalStory).toHaveBeenCalledWith('g1', { text: 'On track', is_pinned: true }, undefined)
		expect(handlers.has('asana_comment_goal_list')).toBe(false)
	})
})

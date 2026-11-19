import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { storyCommand } from './cli.js'
import { createAsanaStoryGateway } from './gateway.js'
import { registerStoryTools } from './mcp.js'

const fields = { opt_fields: 'text,gid' }
const read = { optFields: 'text,gid' }

describe('story writes accept opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends opt_fields on create, update, and goal create', async () => {
		const ok = { data: { gid: 's1' } } as never
		const create = vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask').mockResolvedValue(ok)
		const update = vi.spyOn(Asana.StoriesApi.prototype, 'updateStory').mockResolvedValue(ok)
		const createGoal = vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForGoal').mockResolvedValue(ok)
		const gateway = createAsanaStoryGateway({} as Asana.ApiClient)

		await gateway.createStory('t1', { text: 'x' }, read)
		await gateway.updateStory('s1', { text: 'x' }, read)
		await gateway.createGoalStory('g1', { text: 'x' }, read)

		expect(create.mock.calls[0]?.[2]).toEqual(fields)
		expect(update.mock.calls[0]?.[2]).toEqual(fields)
		expect(createGoal.mock.calls[0]?.[2]).toEqual(fields)
	})

	it('CLI --opt-fields reaches the api method for story and comment commands', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = {
			createStory: vi.fn().mockResolvedValue({ gid: 's1' }),
			updateStory: vi.fn().mockResolvedValue({ gid: 's1' }),
			createGoalStory: vi.fn().mockResolvedValue({ gid: 's1' }),
		}
		const of = ['--opt-fields', 'text,gid']

		for (const name of ['story', 'comment']) {
			const run = (...args: string[]) =>
				new Command()
					.addCommand(storyCommand(name, api as never))
					.parseAsync(['node', 'test', name, ...args], { from: 'node' })
			await run('create', 'hi', '--task-gid', 't1', ...of)
			await run('update', 's1', 'hi', ...of)
			if (name === 'story') await run('create-goal', 'g1', 'hi', ...of)
		}

		expect(api.createStory).toHaveBeenCalledTimes(2)
		expect(api.createStory).toHaveBeenLastCalledWith('t1', expect.anything(), read)
		expect(api.updateStory).toHaveBeenLastCalledWith('s1', expect.anything(), read)
		expect(api.createGoalStory).toHaveBeenCalledWith('g1', expect.anything(), read)
	})

	it('MCP opt_fields reaches the api method for story and comment tools', async () => {
		const handlers = new Map<string, (p: never) => Promise<unknown>>()
		const server = { tool: (name: string, _d: string, _s: unknown, h: never) => handlers.set(name, h) }
		const api = {
			createStory: vi.fn().mockResolvedValue({}),
			updateStory: vi.fn().mockResolvedValue({}),
			createGoalStory: vi.fn().mockResolvedValue({}),
		}
		registerStoryTools(server as never, api as never)
		const call = (name: string, p: object) => handlers.get(name)?.({ ...p, opt_fields: 'text,gid' } as never)

		await call('asana_story_create', { task_gid: 't1', text: 'hi' })
		await call('asana_comment_create', { task_gid: 't1', text: 'hi' })
		await call('asana_story_update', { story_gid: 's1', text: 'hi' })
		await call('asana_comment_update', { story_gid: 's1', text: 'hi' })
		await call('asana_story_goal_create', { goal_gid: 'g1', text: 'hi' })

		expect(api.createStory).toHaveBeenCalledTimes(2)
		expect(api.createStory).toHaveBeenLastCalledWith('t1', expect.anything(), read)
		expect(api.updateStory).toHaveBeenCalledTimes(2)
		expect(api.updateStory).toHaveBeenLastCalledWith('s1', expect.anything(), read)
		expect(api.createGoalStory).toHaveBeenCalledWith('g1', expect.anything(), read)
	})
})

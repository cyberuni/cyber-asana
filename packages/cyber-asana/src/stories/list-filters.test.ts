import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStoryApi } from './api.js'
import { storyCommand } from './cli.js'
import { registerStoryTools } from './mcp.js'

const AFTER = '2026-11-01T00:00:00Z'

async function run(api: Record<string, unknown>, group: 'story' | 'comment', ...argv: string[]) {
	const story = storyCommand(group, api as never)
	const walk = (cmd: Command) => {
		cmd.exitOverride().configureOutput({ writeErr: () => {} })
		cmd.commands.forEach(walk)
	}
	walk(story)
	const program = new Command().addCommand(story)
	await program.parseAsync(['node', 't', group, ...argv], { from: 'node' })
}

function mcp(api: Record<string, unknown>) {
	const handlers = new Map<string, (p: any) => Promise<any>>()
	const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
	registerStoryTools(server as never, api as never)
	return handlers
}

describe('story list filters and parent_comment', () => {
	afterEach(() => vi.restoreAllMocks())

	it.each(['story', 'comment'] as const)('%s list forwards the filters with the pagination', async (group) => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStories = vi.fn().mockResolvedValue([])

		await run(
			{ listStories },
			group,
			'list',
			'--task-gid',
			't1',
			'--created-after',
			AFTER,
			'--comments-only',
			'--newest-first',
			'--limit',
			'5',
		)

		expect(listStories).toHaveBeenCalledWith(
			't1',
			expect.objectContaining({ limit: 5, createdAfter: AFTER, commentsOnly: true, sortAscending: false }),
		)
	})

	it('story list sends no filter keys by default', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStories = vi.fn().mockResolvedValue([])

		await run({ listStories }, 'story', 'list', '--task-gid', 't1')

		const opts = listStories.mock.calls[0]?.[1]
		expect(opts).not.toHaveProperty('createdAfter')
		expect(opts).not.toHaveProperty('commentsOnly')
		expect(opts).not.toHaveProperty('sortAscending')
	})

	it('story list rejects an unparseable --created-after before calling the api', async () => {
		const listStories = vi.fn()

		await expect(
			run({ listStories }, 'story', 'list', '--task-gid', 't1', '--created-after', 'yesterday'),
		).rejects.toThrow(/created_after must be an ISO 8601 date-time/)
		expect(listStories).not.toHaveBeenCalled()
	})

	it('story list-goal forwards the filters', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listGoalStories = vi.fn().mockResolvedValue([])

		await run(
			{ listGoalStories },
			'story',
			'list-goal',
			'g1',
			'--created-after',
			AFTER,
			'--comments-only',
			'--newest-first',
		)

		expect(listGoalStories).toHaveBeenCalledWith(
			'g1',
			expect.objectContaining({ createdAfter: AFTER, commentsOnly: true, sortAscending: false }),
		)
	})

	it.each(['story', 'comment'] as const)('%s create forwards --reply-to as parent_comment', async (group) => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const createStory = vi.fn().mockResolvedValue({ gid: 's1' })

		await run({ createStory }, group, 'create', 'Agreed', '--task-gid', 't1', '--reply-to', 'c1')

		expect(createStory).toHaveBeenCalledWith('t1', { text: 'Agreed', parent_comment: 'c1' }, undefined)
	})

	it('asana_story_list and asana_comment_list forward the filters', async () => {
		const listStories = vi.fn().mockResolvedValue([])
		const h = mcp({ listStories })

		await h.get('asana_story_list')?.({
			task_gid: 't1',
			created_after: AFTER,
			comments_only: true,
			sort_ascending: false,
			limit: 5,
		})
		await h.get('asana_comment_list')?.({ task_gid: 't1', comments_only: true })

		expect(listStories).toHaveBeenNthCalledWith(
			1,
			't1',
			expect.objectContaining({ limit: 5, createdAfter: AFTER, commentsOnly: true, sortAscending: false }),
		)
		expect(listStories).toHaveBeenNthCalledWith(2, 't1', expect.objectContaining({ commentsOnly: true }))
	})

	it('asana_story_goal_list forwards the filters', async () => {
		const listGoalStories = vi.fn().mockResolvedValue([])

		await mcp({ listGoalStories }).get('asana_story_goal_list')?.({
			goal_gid: 'g1',
			created_after: AFTER,
			comments_only: true,
			sort_ascending: true,
		})

		expect(listGoalStories).toHaveBeenCalledWith(
			'g1',
			expect.objectContaining({ createdAfter: AFTER, commentsOnly: true, sortAscending: true }),
		)
	})

	it('asana_story_create and asana_comment_create forward parent_comment_gid as parent_comment', async () => {
		const createStory = vi.fn().mockResolvedValue({ gid: 's1' })
		const h = mcp({ createStory })

		await h.get('asana_story_create')?.({ task_gid: 't1', text: 'Agreed', parent_comment_gid: 'c1' })
		await h.get('asana_comment_create')?.({ task_gid: 't1', text: 'Agreed', parent_comment_gid: 'c1' })

		expect(createStory).toHaveBeenCalledTimes(2)
		for (const call of createStory.mock.calls) {
			expect(call).toEqual(['t1', { text: 'Agreed', parent_comment: 'c1' }, undefined])
		}
	})

	it('the api validates created_after on both list operations and passes parent_comment through', async () => {
		const gateway = {
			listStories: vi.fn().mockResolvedValue([]),
			listGoalStories: vi.fn().mockResolvedValue([]),
			createStory: vi.fn().mockResolvedValue({ gid: 's1' }),
		}
		const api = createStoryApi(gateway as never)

		await api.listStories('t1', { createdAfter: AFTER })
		await api.createStory('t1', { text: 'Agreed', parent_comment: 'c1' })
		await expect(api.listStories('t1', { createdAfter: 'soon' })).rejects.toThrow(/created_after/)
		await expect(api.listGoalStories('g1', { createdAfter: 'soon' })).rejects.toThrow(/created_after/)
		expect(gateway.listGoalStories).not.toHaveBeenCalled()

		expect(gateway.listStories).toHaveBeenCalledWith('t1', { createdAfter: AFTER })
		expect(gateway.createStory).toHaveBeenCalledWith('t1', { text: 'Agreed', parent_comment: 'c1' }, undefined)
	})
})

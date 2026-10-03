import { expect, it } from 'vitest'
import type { TaskApi } from './api.js'

export type GetWithStoriesAcceptanceDeps = {
	getApi: () => Pick<TaskApi, 'getTask' | 'getTaskWithStories'>
	taskGid: string
	/** Every story the task has, when the double knows it; the live API leaves it unset. */
	expectedStoryCount?: number
}

type Story = { gid: string; created_at: string }

export function defineGetWithStoriesAcceptanceSpecs(deps: GetWithStoriesAcceptanceDeps) {
	return () => {
		it('returns the task with its stories in one payload', async () => {
			const api = deps.getApi()
			const task = await api.getTask(deps.taskGid)
			const result = await api.getTaskWithStories(deps.taskGid)

			expect(result.gid).toBe(task.gid)
			expect(result.name).toBe(task.name)
			expect(Array.isArray(result.stories)).toBe(true)
			for (const story of result.stories as Story[]) {
				expect(story.gid).toEqual(expect.any(String))
				expect(story.created_at).toEqual(expect.any(String))
			}
			if (deps.expectedStoryCount !== undefined) expect(result.stories).toHaveLength(deps.expectedStoryCount)
		})

		it('keeps only the stories created at or after --since', async () => {
			const api = deps.getApi()
			const all = (await api.getTaskWithStories(deps.taskGid)).stories as Story[]
			if (all.length === 0) return
			const since = all[all.length - 1].created_at

			const result = await api.getTaskWithStories(deps.taskGid, { since })

			const expected = all.filter((story) => Date.parse(story.created_at) >= Date.parse(since))
			expect((result.stories as Story[]).map((story) => story.gid)).toEqual(expected.map((story) => story.gid))
		})

		it('returns no stories when --since is in the future', async () => {
			const result = await deps.getApi().getTaskWithStories(deps.taskGid, { since: '9999-12-31T00:00:00Z' })

			expect(result.stories).toEqual([])
		})

		it('rejects a --since that is not an ISO 8601 time', async () => {
			await expect(deps.getApi().getTaskWithStories(deps.taskGid, { since: 'yesterday' })).rejects.toThrow(/--since/)
		})
	}
}

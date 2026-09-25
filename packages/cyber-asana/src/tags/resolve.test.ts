import { describe, expect, it, vi } from 'vitest'
import { resolveTagRefs } from './resolve.js'

describe('tags/resolve', () => {
	function listing(...tags: Array<{ gid: string; name: string }>) {
		return vi.fn().mockResolvedValue({ data: tags, next_page: null })
	}

	it('returns undefined when given nothing', async () => {
		const listTags = listing()
		expect(await resolveTagRefs(undefined, 'w1', { listTags })).toBeUndefined()
		expect(listTags).not.toHaveBeenCalled()
	})

	it('returns undefined for an empty list', async () => {
		expect(await resolveTagRefs([], 'w1', { listTags: listing() })).toBeUndefined()
	})

	it('passes GIDs through without calling the API', async () => {
		const listTags = listing()

		expect(await resolveTagRefs(['1067703251650', '123'], 'w1', { listTags })).toEqual(['1067703251650', '123'])
		expect(listTags).not.toHaveBeenCalled()
	})

	it('resolves a name to its GID, case-insensitively', async () => {
		const listTags = listing({ gid: '1067703251650', name: 'High Important' })

		expect(await resolveTagRefs(['high important'], 'w1', { listTags })).toEqual(['1067703251650'])
	})

	it('resolves a mixed list with one listing call', async () => {
		const listTags = listing({ gid: '900', name: 'eng' }, { gid: '901', name: 'ops' })

		expect(await resolveTagRefs(['123', 'eng', 'ops'], 'w1', { listTags })).toEqual(['123', '900', '901'])
		expect(listTags).toHaveBeenCalledTimes(1)
	})

	it('names the tag and how to create it when no tag matches', async () => {
		const listTags = listing({ gid: '900', name: 'eng' })

		await expect(resolveTagRefs(['nope'], 'w1', { listTags })).rejects.toThrow(
			/Tag "nope" is not in workspace w1.*tag create "nope"/s,
		)
	})

	it('refuses to guess when two tags share a name', async () => {
		const listTags = listing({ gid: '900', name: 'eng' }, { gid: '901', name: 'Eng' })

		await expect(resolveTagRefs(['eng'], 'w1', { listTags })).rejects.toThrow(/"eng" matches 2 tags: 900, 901/)
	})

	it('follows pagination so a tag on a later page still resolves', async () => {
		const listTags = vi.fn().mockResolvedValue({ data: [{ gid: '900', name: 'eng' }], next_page: null })

		await resolveTagRefs(['eng'], 'w1', { listTags })

		expect(listTags).toHaveBeenCalledWith('w1', expect.objectContaining({ fetchAll: true, optFields: 'gid,name' }))
	})
})

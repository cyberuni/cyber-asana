import { describe, expect, it } from 'vitest'
import { findCommitment, formatCommitment, parseCommitment } from './commitment.js'

const tasks = [
	{ gid: '11', name: 'Login | form', story: 3, task: 0 },
	{ gid: '12', name: 'Cleanup', story: 0, task: 1.5 },
]

describe('commitment snapshot', () => {
	it('writes a titled, countable text that reads back to the same tasks', () => {
		const posted = formatCommitment({ n: 2, name: 'Sprint 2' }, tasks)
		expect(posted.title).toBe('Sprint 2 started')
		expect(posted.text).toContain('2 tasks, 3 story points, 1.5 task points')
		expect(parseCommitment(posted.text)).toEqual({ n: 2, tasks })
	})

	it('ignores a status update that is not a commitment snapshot', () => {
		expect(parseCommitment('Weekly status: all good')).toBeUndefined()
	})

	it('picks the earliest snapshot for the sprint and ignores other sprints', () => {
		const at = (n: number, created_at: string) => ({
			created_at,
			text: formatCommitment({ n, name: `Sprint ${n}` }, tasks).text,
		})
		const found = findCommitment(
			[at(2, '2026-01-07T00:00:00Z'), at(1, '2026-01-01T00:00:00Z'), at(2, '2026-01-06T00:00:00Z')],
			2,
		)
		expect(found?.created_at).toBe('2026-01-06T00:00:00Z')
		expect(findCommitment([], 2)).toBeUndefined()
	})
})

import { describe, expect, it, vi } from 'vitest'
import { deleteIdempotently, deleteMessage } from './idempotent-delete.js'

function asanaError(status: number) {
	return { response: { status, body: { errors: [{ message: 'boom' }] } } }
}

describe('deleteIdempotently', () => {
	it('reports a first delete as a real removal', async () => {
		const remove = vi.fn().mockResolvedValue(undefined)
		await expect(deleteIdempotently('task', 't1', remove)).resolves.toEqual({
			deleted: true,
			resource: 'task',
			gid: 't1',
			already_absent: false,
		})
		expect(remove).toHaveBeenCalledOnce()
	})

	it('treats a 404 as already done rather than a failure', async () => {
		const remove = vi.fn().mockRejectedValue(asanaError(404))
		await expect(deleteIdempotently('task', 't1', remove)).resolves.toEqual({
			deleted: true,
			resource: 'task',
			gid: 't1',
			already_absent: true,
		})
	})

	it('still propagates errors that are not a missing resource', async () => {
		await expect(deleteIdempotently('task', 't1', () => Promise.reject(asanaError(403)))).rejects.toBeDefined()
		await expect(deleteIdempotently('task', 't1', () => Promise.reject(asanaError(500)))).rejects.toBeDefined()
		await expect(deleteIdempotently('task', 't1', () => Promise.reject(new Error('offline')))).rejects.toThrow(
			'offline',
		)
	})
})

describe('deleteMessage', () => {
	it('distinguishes a fresh delete from a repeat', () => {
		expect(deleteMessage({ deleted: true, resource: 'task', gid: 't1', already_absent: false }, 'Task')).toBe(
			'Deleted task t1',
		)
		expect(deleteMessage({ deleted: true, resource: 'task', gid: 't1', already_absent: true }, 'Task')).toBe(
			'Task t1 was already deleted',
		)
	})
})

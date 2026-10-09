import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOooApi } from './api.js'
import { createOooEntry, deleteOooEntry, getOooEntry, listOooEntries, updateOooEntry } from './default.js'

vi.mock('../platform/client.js', () => ({
	createClient: () => ({}),
}))

const mockEntry = {
	gid: 'ooo1',
	resource_type: 'ooo_entry',
	start_date: '2026-01-01',
	end_date: '2026-01-15',
	user: { gid: 'user1', name: 'Ada' },
}

describe('ooo/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listOooEntries scopes by user and workspace', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'getOooEntries').mockResolvedValue({
			data: [mockEntry],
		} as never)

		const result = await listOooEntries('user1', 'ws1')

		expect(result).toEqual({ data: [mockEntry], next_page: null, limit: 100 })
		expect(Asana.OooEntriesApi.prototype.getOooEntries).toHaveBeenCalledWith('user1', 'ws1', { limit: 100 })
	})

	it('listOooEntries forwards the date window filters', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'getOooEntries').mockResolvedValue({
			data: [mockEntry],
		} as never)

		await listOooEntries('user1', 'ws1', {
			startDate: '2026-01-01',
			endDate: '2026-01-31',
			optFields: 'gid,start_date',
		})

		expect(Asana.OooEntriesApi.prototype.getOooEntries).toHaveBeenCalledWith('user1', 'ws1', {
			limit: 100,
			opt_fields: 'gid,start_date',
			start_date: '2026-01-01',
			end_date: '2026-01-31',
		})
	})

	it('getOooEntry calls getOooEntry with gid', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'getOooEntry').mockResolvedValue({
			data: mockEntry,
		} as never)

		const result = await getOooEntry('ooo1')

		expect(result).toEqual(mockEntry)
		expect(Asana.OooEntriesApi.prototype.getOooEntry).toHaveBeenCalledWith('ooo1', {})
	})

	it('createOooEntry sends user, workspace, and the date window', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'createOooEntry').mockResolvedValue({
			data: mockEntry,
		} as never)

		const result = await createOooEntry('user1', 'ws1', {
			start_date: '2026-01-01',
			end_date: '2026-01-15',
		})

		expect(result).toEqual(mockEntry)
		expect(Asana.OooEntriesApi.prototype.createOooEntry).toHaveBeenCalledWith({
			data: {
				user: 'user1',
				workspace: 'ws1',
				start_date: '2026-01-01',
				end_date: '2026-01-15',
			},
		})
	})

	it('updateOooEntry forwards the mutable date fields', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'updateOooEntry').mockResolvedValue({
			data: mockEntry,
		} as never)

		const result = await updateOooEntry('ooo1', { end_date: '2026-01-20' })

		expect(result).toEqual(mockEntry)
		expect(Asana.OooEntriesApi.prototype.updateOooEntry).toHaveBeenCalledWith(
			{ data: { end_date: '2026-01-20' } },
			'ooo1',
			{},
		)
	})

	it('deleteOooEntry calls deleteOooEntry with gid', async () => {
		vi.spyOn(Asana.OooEntriesApi.prototype, 'deleteOooEntry').mockResolvedValue(undefined as never)

		await deleteOooEntry('ooo1')

		expect(Asana.OooEntriesApi.prototype.deleteOooEntry).toHaveBeenCalledWith('ooo1')
	})
})

describe('createOooApi', () => {
	it('uses the provided gateway', async () => {
		const listOooEntries = vi.fn().mockResolvedValue({ data: [mockEntry], next_page: null, limit: 100 })
		const api = createOooApi({
			listOooEntries,
			getOooEntry: vi.fn(),
			createOooEntry: vi.fn(),
			updateOooEntry: vi.fn(),
			deleteOooEntry: vi.fn(),
		})

		const result = await api.listOooEntries('user1', 'ws1')

		expect(result).toEqual({ data: [mockEntry], next_page: null, limit: 100 })
		expect(listOooEntries).toHaveBeenCalledWith('user1', 'ws1', undefined)
	})
})

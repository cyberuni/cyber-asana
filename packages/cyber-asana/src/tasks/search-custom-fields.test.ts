import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaTaskGateway } from './gateway.js'
import { parseCustomFieldFilter } from './search-custom-fields.js'

describe('tasks/search custom-field filters', () => {
	afterEach(() => vi.restoreAllMocks())

	it('parses <gid>.<operator>=<value> into a filter', () => {
		expect(parseCustomFieldFilter('123.value=5')).toEqual({ gid: '123', operator: 'value', value: '5' })
		expect(parseCustomFieldFilter('123.is_set=true')).toEqual({ gid: '123', operator: 'is_set', value: 'true' })
		expect(parseCustomFieldFilter('123.less_than=9.5')).toEqual({ gid: '123', operator: 'less_than', value: '9.5' })
	})

	it('rejects an unknown operator, a missing gid, and a missing value', () => {
		expect(() => parseCustomFieldFilter('123.eq=5')).toThrow(/operator/)
		expect(() => parseCustomFieldFilter('.value=5')).toThrow(/gid/)
		expect(() => parseCustomFieldFilter('123.value')).toThrow(/<gid>\.<operator>=<value>/)
	})

	it('sends each filter as custom_fields.{gid}.{operator}', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({ data: [] } as never)

		await createAsanaTaskGateway({} as Asana.ApiClient).searchTasks('ws1', {
			customFields: [
				{ gid: '123', operator: 'value', value: '5' },
				{ gid: '456', operator: 'is_set', value: 'false' },
			],
		})

		expect(spy.mock.calls[0]?.[1]).toMatchObject({
			'custom_fields.123.value': '5',
			'custom_fields.456.is_set': 'false',
		})
	})
})

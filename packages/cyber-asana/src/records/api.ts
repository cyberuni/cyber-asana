import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { validateStickerName } from '../stories/write-options.js'
import type {
	CreateRecordOptions,
	RecordGateway,
	RecordListFilters,
	RecordSearchFilters,
	RecordSearchOptions,
	RecordStoryFields,
	RecordStoryFilters,
	UpdateRecordFields,
} from './gateway.js'

export type {
	CreateRecordOptions,
	RecordCustomFields,
	RecordListFilters,
	RecordSearchFilters,
	RecordSearchOptions,
	RecordStoryFields,
	RecordStoryFilters,
	TableRecord,
	UpdateRecordFields,
} from './gateway.js'

export type RecordApi = ReturnType<typeof createRecordApi>

export function createRecordApi(gateway: RecordGateway) {
	return {
		listRecords(tableGid: string, filters?: RecordListFilters, opts?: PaginationOptions) {
			return gateway.listRecords(tableGid, filters, opts)
		},
		searchRecords(workspaceGid: string, filters?: RecordSearchFilters, opts?: RecordSearchOptions) {
			return gateway.searchRecords(workspaceGid, filters, opts)
		},
		getRecord(recordGid: string, opts?: ReadOptions) {
			return gateway.getRecord(recordGid, opts)
		},
		createRecord(tableGid: string, name: string, opts?: CreateRecordOptions, readOpts?: ReadOptions) {
			return gateway.createRecord(tableGid, name, opts, readOpts)
		},
		updateRecord(recordGid: string, fields: UpdateRecordFields, opts?: ReadOptions) {
			return gateway.updateRecord(recordGid, fields, opts)
		},
		deleteRecord(recordGid: string) {
			return gateway.deleteRecord(recordGid)
		},
		listRecordStories(recordGid: string, filters?: RecordStoryFilters, opts?: PaginationOptions) {
			return gateway.listRecordStories(recordGid, filters, opts)
		},
		async createRecordStory(recordGid: string, fields: RecordStoryFields, opts?: ReadOptions) {
			if (fields.sticker_name !== undefined) validateStickerName(fields.sticker_name)
			return await gateway.createRecordStory(recordGid, fields, opts)
		},
	}
}

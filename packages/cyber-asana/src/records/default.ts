import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createRecordApi } from './api.js'
import {
	type CreateRecordOptions,
	createAsanaRecordGateway,
	type RecordListFilters,
	type RecordSearchFilters,
	type RecordSearchOptions,
	type RecordStoryFields,
	type RecordStoryFilters,
	type UpdateRecordFields,
} from './gateway.js'

function defaultRecordApi() {
	return createRecordApi(createAsanaRecordGateway(createClient()))
}

export async function listRecords(tableGid: string, filters?: RecordListFilters, opts?: PaginationOptions) {
	return defaultRecordApi().listRecords(tableGid, filters, opts)
}

export async function searchRecords(workspaceGid: string, filters?: RecordSearchFilters, opts?: RecordSearchOptions) {
	return defaultRecordApi().searchRecords(workspaceGid, filters, opts)
}

export async function getRecord(recordGid: string, opts?: ReadOptions) {
	return defaultRecordApi().getRecord(recordGid, opts)
}

export async function createRecord(tableGid: string, name: string, opts?: CreateRecordOptions, readOpts?: ReadOptions) {
	return defaultRecordApi().createRecord(tableGid, name, opts, readOpts)
}

export async function updateRecord(recordGid: string, fields: UpdateRecordFields, opts?: ReadOptions) {
	return defaultRecordApi().updateRecord(recordGid, fields, opts)
}

export async function deleteRecord(recordGid: string) {
	return defaultRecordApi().deleteRecord(recordGid)
}

export async function listRecordStories(recordGid: string, filters?: RecordStoryFilters, opts?: PaginationOptions) {
	return defaultRecordApi().listRecordStories(recordGid, filters, opts)
}

export async function createRecordStory(recordGid: string, fields: RecordStoryFields, opts?: ReadOptions) {
	return defaultRecordApi().createRecordStory(recordGid, fields, opts)
}

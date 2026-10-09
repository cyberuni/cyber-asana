import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { TagGateway, TagWriteFields } from './gateway.js'
import type { TagCreateFields } from './write-options.js'

export type TagApi = ReturnType<typeof createTagApi>

export function createTagApi(gateway: TagGateway) {
	return {
		listTags(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTags(workspaceGid, opts)
		},
		getTag(tagGid: string, opts?: ReadOptions) {
			return gateway.getTag(tagGid, opts)
		},
		createTag(workspaceGid: string, name: string, fields?: TagCreateFields) {
			return gateway.createTag(workspaceGid, name, fields)
		},
		updateTag(tagGid: string, fields: TagWriteFields) {
			return gateway.updateTag(tagGid, fields)
		},
		deleteTag(tagGid: string) {
			return gateway.deleteTag(tagGid)
		},
		listTagsForTask(taskGid: string, opts?: PaginationOptions) {
			return gateway.listTagsForTask(taskGid, opts)
		},
		listTasksForTag(tagGid: string, opts?: PaginationOptions) {
			return gateway.listTasksForTag(tagGid, opts)
		},
		addTagToTask(taskGid: string, tagGid: string) {
			return gateway.addTagToTask(taskGid, tagGid)
		},
		removeTagFromTask(taskGid: string, tagGid: string) {
			return gateway.removeTagFromTask(taskGid, tagGid)
		},
	}
}

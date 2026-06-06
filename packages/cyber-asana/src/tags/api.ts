import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaTagGateway, type TagGateway, type TagWriteFields } from './gateway.js'

export type TagApi = ReturnType<typeof createTagApi>

export function createTagApi(gateway: TagGateway) {
	return {
		listTags(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTags(workspaceGid, opts)
		},
		getTag(tagGid: string) {
			return gateway.getTag(tagGid)
		},
		createTag(workspaceGid: string, name: string, fields?: Omit<TagWriteFields, 'name'>) {
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

function defaultTagApi() {
	return createTagApi(createAsanaTagGateway(createClient()))
}

export async function listTags(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTagApi().listTags(workspaceGid, opts)
}

export async function getTag(tagGid: string) {
	return defaultTagApi().getTag(tagGid)
}

export async function createTag(workspaceGid: string, name: string, fields?: Omit<TagWriteFields, 'name'>) {
	return defaultTagApi().createTag(workspaceGid, name, fields)
}

export async function updateTag(tagGid: string, fields: TagWriteFields) {
	return defaultTagApi().updateTag(tagGid, fields)
}

export async function deleteTag(tagGid: string) {
	return defaultTagApi().deleteTag(tagGid)
}

export async function listTagsForTask(taskGid: string, opts?: PaginationOptions) {
	return defaultTagApi().listTagsForTask(taskGid, opts)
}

export async function listTasksForTag(tagGid: string, opts?: PaginationOptions) {
	return defaultTagApi().listTasksForTag(tagGid, opts)
}

export async function addTagToTask(taskGid: string, tagGid: string) {
	return defaultTagApi().addTagToTask(taskGid, tagGid)
}

export async function removeTagFromTask(taskGid: string, tagGid: string) {
	return defaultTagApi().removeTagFromTask(taskGid, tagGid)
}

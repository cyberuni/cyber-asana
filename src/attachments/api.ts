import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaAttachmentGateway, type AttachmentGateway } from './gateway.js'

export type AttachmentApi = ReturnType<typeof createAttachmentApi>

export function createAttachmentApi(gateway: AttachmentGateway) {
	return {
		listAttachments(taskGid: string, opts?: PaginationOptions) {
			return gateway.listAttachments(taskGid, opts)
		},
		getAttachment(attachmentGid: string) {
			return gateway.getAttachment(attachmentGid)
		},
	}
}

function defaultAttachmentApi() {
	return createAttachmentApi(createAsanaAttachmentGateway(createClient()))
}

export async function listAttachments(taskGid: string, opts?: PaginationOptions) {
	return defaultAttachmentApi().listAttachments(taskGid, opts)
}

export async function getAttachment(attachmentGid: string) {
	return defaultAttachmentApi().getAttachment(attachmentGid)
}

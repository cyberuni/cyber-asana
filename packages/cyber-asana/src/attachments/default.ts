import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createAttachmentApi } from './api.js'
import type { AttachmentCreateFields } from './create-options.js'
import { createAsanaAttachmentGateway } from './gateway.js'

function defaultAttachmentApi() {
	return createAttachmentApi(createAsanaAttachmentGateway(createClient()))
}

export async function listAttachments(parentGid: string, opts?: PaginationOptions) {
	return defaultAttachmentApi().listAttachments(parentGid, opts)
}

export async function getAttachment(attachmentGid: string, opts?: ReadOptions) {
	return defaultAttachmentApi().getAttachment(attachmentGid, opts)
}

export async function createAttachment(parentGid: string, fields: AttachmentCreateFields) {
	return defaultAttachmentApi().createAttachment(parentGid, fields)
}

export async function deleteAttachment(attachmentGid: string) {
	return defaultAttachmentApi().deleteAttachment(attachmentGid)
}

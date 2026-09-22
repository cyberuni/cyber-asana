import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type CreateAttachmentRequest = {
	parent: string
	name: string
	/** Streamed to Asana as multipart/form-data; omitted for an external url attachment. */
	file?: NodeJS.ReadableStream
	url?: string
	resourceSubtype?: string
	/** Only honoured for external attachments, and only under an OAuth token. */
	connectToApp?: boolean
}

export type AttachmentGateway = {
	listAttachments(taskGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getAttachment(attachmentGid: string, opts?: ReadOptions): Promise<any>
	createAttachment(request: CreateAttachmentRequest): Promise<any>
	deleteAttachment(attachmentGid: string): Promise<void>
}

export function createAsanaAttachmentGateway(client: Asana.ApiClient): AttachmentGateway {
	const attachmentsApi = new Asana.AttachmentsApi(client)

	return {
		async listAttachments(taskGid, opts) {
			const res = await attachmentsApi.getAttachmentsForObject(taskGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getAttachment(attachmentGid, opts) {
			const res = await attachmentsApi.getAttachment(attachmentGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createAttachment(request) {
			const res = await attachmentsApi.createAttachmentForObject({
				parent: request.parent,
				name: request.name,
				// The SDK types `file` as a string, but its ApiClient duck-types any Node
				// readable and hands it to superagent's .attach(), so the file is streamed
				// rather than buffered into memory.
				...(request.file ? { file: request.file as unknown as string } : {}),
				...(request.url ? { url: request.url } : {}),
				...(request.resourceSubtype ? { resource_subtype: request.resourceSubtype } : {}),
				...(request.connectToApp !== undefined ? { connect_to_app: request.connectToApp } : {}),
			})
			return res.data
		},
		async deleteAttachment(attachmentGid) {
			await attachmentsApi.deleteAttachment(attachmentGid)
		},
	}
}

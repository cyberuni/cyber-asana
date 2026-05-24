import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type AttachmentGateway = {
	listAttachments(taskGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getAttachment(attachmentGid: string): Promise<any>
}

export function createAsanaAttachmentGateway(client: Asana.ApiClient): AttachmentGateway {
	const attachmentsApi = new Asana.AttachmentsApi(client)

	return {
		async listAttachments(taskGid, opts) {
			const res = await attachmentsApi.getAttachmentsForObject(taskGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getAttachment(attachmentGid) {
			const res = await attachmentsApi.getAttachment(attachmentGid, {})
			return res.data
		},
	}
}

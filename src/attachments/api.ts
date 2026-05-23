import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export async function listAttachments(taskGid: string, opts?: PaginationOptions) {
	const api = new Asana.AttachmentsApi(createClient())
	const res = await api.getAttachmentsForObject(taskGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function getAttachment(attachmentGid: string) {
	const api = new Asana.AttachmentsApi(createClient())
	const res = await api.getAttachment(attachmentGid, {})
	return res.data
}

import Asana from 'asana'
import { createClient } from '../client.js'

export async function listAttachments(taskGid: string) {
	const api = new Asana.AttachmentsApi(createClient())
	const res = await api.getAttachmentsForObject(taskGid, {})
	return res.data
}

export async function getAttachment(attachmentGid: string) {
	const api = new Asana.AttachmentsApi(createClient())
	const res = await api.getAttachment(attachmentGid, {})
	return res.data
}

import { createReadStream, statSync } from 'node:fs'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { type AttachmentCreateFields, buildAttachmentCreateInput } from './create-options.js'
import type { AttachmentGateway } from './gateway.js'

export type AttachmentApi = ReturnType<typeof createAttachmentApi>

// createReadStream reports a missing path asynchronously, after the request is
// already in flight; statting first keeps a local mistake a local error.
function openFileForUpload(path: string) {
	const stats = statSync(path)
	if (!stats.isFile()) throw new Error(`${path} is not a file`)
	return createReadStream(path)
}

export function createAttachmentApi(gateway: AttachmentGateway) {
	return {
		listAttachments(parentGid: string, opts?: PaginationOptions) {
			return gateway.listAttachments(parentGid, opts)
		},
		getAttachment(attachmentGid: string, opts?: ReadOptions) {
			return gateway.getAttachment(attachmentGid, opts)
		},
		// async so a local validation or filesystem error surfaces as a rejected
		// promise, like every other failure a caller of this facade awaits.
		async createAttachment(parentGid: string, fields: AttachmentCreateFields) {
			const input = buildAttachmentCreateInput(fields)
			if (input.kind === 'url') {
				return gateway.createAttachment({
					parent: parentGid,
					url: input.url,
					name: input.name,
					resourceSubtype: 'external',
					...(input.connectToApp !== undefined && { connectToApp: input.connectToApp }),
				})
			}
			return gateway.createAttachment({
				parent: parentGid,
				file: openFileForUpload(input.path),
				name: input.name,
			})
		},
		deleteAttachment(attachmentGid: string) {
			return gateway.deleteAttachment(attachmentGid)
		},
	}
}

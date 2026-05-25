import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { AttachmentApi } from './api.js'

export type AttachmentListPaginationAcceptanceDeps = {
	getApi: () => Pick<AttachmentApi, 'listAttachments'>
	taskGid: string
	includeFetchAll?: boolean
}

export function defineAttachmentListPaginationAcceptanceSpecs(deps: AttachmentListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listAttachments(deps.taskGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createAttachmentApi } from './api.js'
import type { AttachmentGateway } from './gateway.js'
import { defineAttachmentListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const taskGid = 'task-test'
const pages = [
	[{ gid: 'att1', name: 'spec.pdf' }],
	[{ gid: 'att2', name: 'notes.txt' }],
	[{ gid: 'att3', name: 'shot.png' }],
]

function createPaginatingAttachmentGateway(): AttachmentGateway {
	return {
		listAttachments: createPaginatingScopedListMock(pages),
		getAttachment: vi.fn(),
	}
}

describe(
	'attachments/list pagination acceptance',
	defineAttachmentListPaginationAcceptanceSpecs({
		getApi: () => createAttachmentApi(createPaginatingAttachmentGateway()),
		taskGid,
	}),
)

describe('attachments/list pagination acceptance gateway double', () => {
	it('exercises listAttachments without importing the Asana SDK', async () => {
		const gateway = createPaginatingAttachmentGateway()
		const api = createAttachmentApi(gateway)

		const result = await api.listAttachments(taskGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'att1', name: 'spec.pdf' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listAttachments).toHaveBeenCalledWith(taskGid, { limit: 25 })
	})
})

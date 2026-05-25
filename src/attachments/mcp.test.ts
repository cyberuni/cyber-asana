import { afterEach, describe, expect, it, vi } from 'vitest'

const listAttachmentsMock = vi.fn()
const getAttachmentMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listAttachments: listAttachmentsMock,
		getAttachment: getAttachmentMock,
	}
})

const { registerAttachmentTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('attachments/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_attachment_list forwards task gid and pagination options', async () => {
		listAttachmentsMock.mockResolvedValue({ data: [{ gid: 'att1', name: 'file.pdf' }], next_page: null, limit: 100 })
		const server = createServer()
		registerAttachmentTools(server as any)

		await server.handlers.get('asana_attachment_list')?.({
			task_gid: 'task1',
			limit: 25,
			opt_fields: 'gid,name',
		})

		expect(listAttachmentsMock).toHaveBeenCalledWith('task1', {
			limit: 25,
			optFields: 'gid,name',
		})
	})

	it('asana_attachment_get forwards attachment gid', async () => {
		getAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const server = createServer()
		registerAttachmentTools(server as any)

		await server.handlers.get('asana_attachment_get')?.({ attachment_gid: 'att1' })

		expect(getAttachmentMock).toHaveBeenCalledWith('att1')
	})

	it('attachment tools can use injected dependencies', async () => {
		const injectedGetAttachment = vi.fn().mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const server = createServer()
		registerAttachmentTools(server as any, {
			listAttachments: vi.fn(),
			getAttachment: injectedGetAttachment,
		})

		await server.handlers.get('asana_attachment_get')?.({ attachment_gid: 'att1' })

		expect(injectedGetAttachment).toHaveBeenCalledWith('att1')
	})
})

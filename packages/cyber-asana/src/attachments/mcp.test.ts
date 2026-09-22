import { afterEach, describe, expect, it, vi } from 'vitest'

const listAttachmentsMock = vi.fn()
const getAttachmentMock = vi.fn()
const createAttachmentMock = vi.fn()
const deleteAttachmentMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listAttachments: listAttachmentsMock,
		getAttachment: getAttachmentMock,
		createAttachment: createAttachmentMock,
		deleteAttachment: deleteAttachmentMock,
	}
})

const { registerAttachmentTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	const descriptions = new Map<string, string>()
	return {
		handlers,
		descriptions,
		tool(name: string, description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
			descriptions.set(name, description)
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

		expect(getAttachmentMock).toHaveBeenCalledWith('att1', undefined)
	})

	it('asana_attachment_list accepts a non-task parent gid', async () => {
		listAttachmentsMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const server = createServer()
		registerAttachmentTools(server as any)

		await server.handlers.get('asana_attachment_list')?.({ parent_gid: 'project1' })

		expect(listAttachmentsMock).toHaveBeenCalledWith('project1', expect.anything())
	})

	it('asana_attachment_list rejects a call that names no parent', async () => {
		const server = createServer()
		registerAttachmentTools(server as any)

		await expect(server.handlers.get('asana_attachment_list')?.({})).rejects.toThrow(/parent_gid/)
	})

	it('asana_attachment_create forwards the parent gid, file path, and name', async () => {
		createAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'sprint.md' })
		const server = createServer()
		registerAttachmentTools(server as any)

		await server.handlers.get('asana_attachment_create')?.({
			parent_gid: 'task1',
			file: '/srv/reports/sprint.md',
			name: 'Sprint report',
		})

		expect(createAttachmentMock).toHaveBeenCalledWith('task1', {
			file: '/srv/reports/sprint.md',
			url: undefined,
			name: 'Sprint report',
		})
	})

	it('asana_attachment_create says where a file path is resolved', () => {
		const server = createServer()
		registerAttachmentTools(server as any)

		expect(server.descriptions.get('asana_attachment_create')).toMatch(/machine running the MCP server/)
	})

	it('asana_attachment_delete forwards the attachment gid and is idempotent', async () => {
		deleteAttachmentMock.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const server = createServer()
		registerAttachmentTools(server as any)

		const result = await server.handlers.get('asana_attachment_delete')?.({ attachment_gid: 'att1' })

		expect(deleteAttachmentMock).toHaveBeenCalledWith('att1')
		expect(JSON.parse(result.content[0].text)).toEqual({
			deleted: true,
			resource: 'attachment',
			gid: 'att1',
			already_absent: true,
		})
	})

	it('attachment tools can use injected dependencies', async () => {
		const injectedGetAttachment = vi.fn().mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const server = createServer()
		registerAttachmentTools(server as any, {
			listAttachments: vi.fn(),
			getAttachment: injectedGetAttachment,
			createAttachment: vi.fn(),
			deleteAttachment: vi.fn(),
		})

		await server.handlers.get('asana_attachment_get')?.({ attachment_gid: 'att1' })

		expect(injectedGetAttachment).toHaveBeenCalledWith('att1', undefined)
	})
	it('asana_attachment_create forwards connect_to_app', async () => {
		createAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'Design doc' })
		const server = createServer()
		registerAttachmentTools(server as any)

		await server.handlers.get('asana_attachment_create')?.({
			parent_gid: 'task1',
			url: 'https://example.com/design',
			connect_to_app: true,
		})

		expect(createAttachmentMock).toHaveBeenCalledWith('task1', {
			file: undefined,
			url: 'https://example.com/design',
			name: undefined,
			connectToApp: true,
		})
	})
})

import { Command } from 'commander'
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

const { attachmentCommand } = await import('./cli.js')

describe('attachments/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('attachment list forwards task gid and pagination options', async () => {
		listAttachmentsMock.mockResolvedValue({ data: [{ gid: 'att1', name: 'file.pdf' }], next_page: null, limit: 100 })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(
			['node', 'test', 'attachment', 'list', '--task-gid', 'task1', '--limit', '25', '--opt-fields', 'gid,name'],
			{ from: 'node' },
		)

		expect(listAttachmentsMock).toHaveBeenCalledWith('task1', {
			limit: 25,
			optFields: 'gid,name',
		})
	})

	it('attachment list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listAttachmentsMock.mockResolvedValue([{ gid: 'att1', name: 'file.pdf' }])
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(['node', 'test', 'attachment', 'list', '--task-gid', 'task1'], { from: 'node' })

		expect(listAttachmentsMock).toHaveBeenCalledWith(
			'task1',
			expect.objectContaining({ optFields: 'gid,name,resource_type' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 attachment(s)')
		expect(lines.some((l) => l.includes('cyber-asana attachment get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('attachment get forwards gid', async () => {
		getAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(['node', 'test', 'attachment', 'get', 'att1'], { from: 'node' })

		expect(getAttachmentMock).toHaveBeenCalledWith('att1', undefined)
	})

	it('attachment list accepts a non-task parent gid', async () => {
		listAttachmentsMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(['node', 'test', 'attachment', 'list', '--parent-gid', 'project1'], { from: 'node' })

		expect(listAttachmentsMock).toHaveBeenCalledWith('project1', expect.anything())
	})

	it('attachment create forwards the parent gid and the file path', async () => {
		createAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'sprint.md' })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(
			['node', 'test', 'attachment', 'create', './sprint.md', '--parent-gid', 'task1', '--name', 'Sprint report'],
			{ from: 'node' },
		)

		expect(createAttachmentMock).toHaveBeenCalledWith('task1', {
			file: './sprint.md',
			url: undefined,
			name: 'Sprint report',
		})
	})

	it('attachment create forwards an external url instead of a file', async () => {
		createAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'Design doc' })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(
			['node', 'test', 'attachment', 'create', '--parent-gid', 'task1', '--url', 'https://example.com/design'],
			{ from: 'node' },
		)

		expect(createAttachmentMock).toHaveBeenCalledWith('task1', {
			file: undefined,
			url: 'https://example.com/design',
			name: undefined,
		})
	})

	it('attachment delete is idempotent when the attachment is already gone', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		deleteAttachmentMock.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(['node', 'test', 'attachment', 'delete', 'att1'], { from: 'node' })

		expect(deleteAttachmentMock).toHaveBeenCalledWith('att1')
		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('Attachment att1 was already deleted')
		logSpy.mockRestore()
	})

	it('attachment command can use injected dependencies', async () => {
		const injectedGetAttachment = vi.fn().mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const program = new Command().addCommand(
			attachmentCommand({
				listAttachments: vi.fn(),
				getAttachment: injectedGetAttachment,
				createAttachment: vi.fn(),
				deleteAttachment: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'attachment', 'get', 'att1'], { from: 'node' })

		expect(injectedGetAttachment).toHaveBeenCalledWith('att1', undefined)
	})
	it('attachment create forwards --connect-to-app for a url attachment', async () => {
		createAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'Design doc' })

		await new Command()
			.addCommand(attachmentCommand())
			.parseAsync(
				[
					'node',
					'test',
					'attachment',
					'create',
					'--url',
					'https://example.com/design',
					'--parent-gid',
					'task1',
					'--connect-to-app',
				],
				{ from: 'node' },
			)

		expect(createAttachmentMock).toHaveBeenCalledWith('task1', {
			file: undefined,
			url: 'https://example.com/design',
			name: undefined,
			connectToApp: true,
		})
	})
})

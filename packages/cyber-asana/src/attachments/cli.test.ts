import { Command } from 'commander'
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

	it('attachment get forwards gid', async () => {
		getAttachmentMock.mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const program = new Command().addCommand(attachmentCommand())

		await program.parseAsync(['node', 'test', 'attachment', 'get', 'att1'], { from: 'node' })

		expect(getAttachmentMock).toHaveBeenCalledWith('att1')
	})

	it('attachment command can use injected dependencies', async () => {
		const injectedGetAttachment = vi.fn().mockResolvedValue({ gid: 'att1', name: 'file.pdf' })
		const program = new Command().addCommand(
			attachmentCommand({
				listAttachments: vi.fn(),
				getAttachment: injectedGetAttachment,
			}),
		)

		await program.parseAsync(['node', 'test', 'attachment', 'get', 'att1'], { from: 'node' })

		expect(injectedGetAttachment).toHaveBeenCalledWith('att1')
	})
})

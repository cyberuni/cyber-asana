import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()
const getUserMock = vi.fn()
const getMeMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listUsers: listUsersMock,
		getUser: getUserMock,
		getMe: getMeMock,
	}
})

const { userCommand } = await import('./cli.js')

describe('users/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('user list forwards workspace gid and pagination options', async () => {
		listUsersMock.mockResolvedValue({ data: [{ gid: 'user1', name: 'Alice' }], next_page: null })
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(
			['node', 'test', 'user', 'list', '--workspace-gid', 'ws1', '--offset', 'abc', '--opt-fields', 'gid,name,email'],
			{ from: 'node' },
		)

		expect(listUsersMock).toHaveBeenCalledWith('ws1', {
			offset: 'abc',
			optFields: 'gid,name,email',
		})
	})

	it('user list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listUsersMock.mockResolvedValue([{ gid: 'user1', name: 'Alice' }])
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listUsersMock).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name,email' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 user(s)')
		expect(lines.some((l) => l.includes('cyber-asana user get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('user list points at out-of-office entries', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listUsersMock.mockResolvedValue([{ gid: 'user1', name: 'Alice' }])
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('cyber-asana ooo list --user-gid <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('user get points at that user out-of-office entries', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		getUserMock.mockResolvedValue({ gid: 'user1', name: 'Alice' })
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'get', 'user1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('cyber-asana ooo list --user-gid user1'))).toBe(true)
		logSpy.mockRestore()
	})

	it('user me points at your own out-of-office entries', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		getMeMock.mockResolvedValue({ gid: 'me', name: 'Me' })
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'me'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('cyber-asana ooo list'))).toBe(true)
		logSpy.mockRestore()
	})

	it('user get forwards gid', async () => {
		getUserMock.mockResolvedValue({ gid: 'user1', name: 'Alice' })
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'get', 'user1'], { from: 'node' })

		expect(getUserMock).toHaveBeenCalledWith('user1', undefined)
	})

	it('user me calls getMe', async () => {
		getMeMock.mockResolvedValue({ gid: 'me', name: 'Me' })
		const program = new Command().addCommand(userCommand())

		await program.parseAsync(['node', 'test', 'user', 'me'], { from: 'node' })

		expect(getMeMock).toHaveBeenCalledWith(undefined)
	})

	it('user command can use injected dependencies', async () => {
		const injectedGetMe = vi.fn().mockResolvedValue({ gid: 'me', name: 'Me' })
		const program = new Command().addCommand(
			userCommand({
				listUsers: vi.fn(),
				getUser: vi.fn(),
				getMe: injectedGetMe,
			}),
		)

		await program.parseAsync(['node', 'test', 'user', 'me'], { from: 'node' })

		expect(injectedGetMe).toHaveBeenCalledWith(undefined)
	})
})

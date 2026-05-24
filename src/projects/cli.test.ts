import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const searchProjectsMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		searchProjects: searchProjectsMock,
	}
})

const { projectCommand } = await import('./cli.js')

describe('projects/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('project search forwards text and filters to searchProjects', async () => {
		searchProjectsMock.mockResolvedValue([{ gid: '1', name: 'Launch Roadmap' }])
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'project',
				'search',
				'launch',
				'--workspace-gid',
				'ws1',
				'--no-completed',
				'--team',
				't1,t2',
				'--owner',
				'me',
				'--member',
				'u1',
				'--member-not',
				'u2',
				'--portfolio',
				'p1',
				'--due-on-before',
				'2026-06-30',
				'--sort-by',
				'due_date',
				'--sort-asc',
				'--opt-fields',
				'gid,name,owner',
			],
			{ from: 'node' },
		)

		expect(searchProjectsMock).toHaveBeenCalledWith('ws1', {
			text: 'launch',
			completed: false,
			teamsAny: 't1,t2',
			ownerAny: 'me',
			membersAny: 'u1',
			membersNot: 'u2',
			portfoliosAny: 'p1',
			dueOnBefore: '2026-06-30',
			sortBy: 'due_date',
			sortAscending: true,
			optFields: 'gid,name,owner',
		})
	})
})

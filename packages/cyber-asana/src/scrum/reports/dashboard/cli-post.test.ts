import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../../../platform/cli/usage.js'
import type { ScrumApi } from '../../api.js'
import { reportCommand } from '../cli.js'

const posted = {
	scope: 'web',
	parent: { gid: 'p1', type: 'project' },
	status_type: 'at_risk',
	status_basis: 'health: 0 errors, 1 warning',
	title: 'Sprint 2 — At risk',
	html_text: '<body><h2>Health</h2>\n</body>',
	notes: ['A status update cannot be edited in Asana, so every post is a new update and the history builds up.'],
	posted: true,
	dry_run: false,
	status_update: { gid: 'st1' },
}

function run(api: ScrumApi, ...args: string[]) {
	const lines: string[] = []
	vi.spyOn(console, 'log').mockImplementation((...a) => {
		lines.push(a.join(' '))
	})
	process.argv = ['node', 'test', ...args]
	const p = new Command().addCommand(reportCommand(() => api))
	p.option('--json').option('--toon')
	installUsageErrors(p)
	return p.parseAsync(['node', 'test', ...args], { from: 'node' }).then(() => lines.join('\n'))
}

describe('report dashboard --post-status', () => {
	const originalArgv = [...process.argv]
	const make = (result: object = posted) =>
		({ reportDashboard: vi.fn(), postDashboardStatus: vi.fn(async () => result) }) as unknown as ScrumApi
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	it('posts, names the update, and says each post is new', async () => {
		const api = make()
		const out = await run(api, 'report', 'dashboard', '--post-status', '--scope', 'web')
		expect(api.postDashboardStatus).toHaveBeenCalledWith({ scope: 'web' }, expect.any(Object), {
			dryRun: false,
		})
		expect(api.reportDashboard).not.toHaveBeenCalled()
		expect(out).toContain('Posted a status update on project p1')
		expect(out).toContain('st1')
		expect(out).toContain('cannot be edited')
		expect(out).toContain('cyber-asana status get st1')
	})

	it('--dry-run prints what would be posted and says nothing was sent', async () => {
		const api = make({ ...posted, posted: false, dry_run: true, status_update: undefined })
		const out = await run(api, 'report', 'dashboard', '--post-status', '--dry-run')
		expect(api.postDashboardStatus).toHaveBeenCalledWith(expect.anything(), expect.any(Object), { dryRun: true })
		expect(out).toContain('Dry run: nothing was posted')
		expect(out).toContain('Sprint 2 — At risk')
		expect(out).toContain('<h2>Health</h2>')
		expect(out).toContain('--post-status')
	})

	it('--json carries the whole post result', async () => {
		const out = await run(make(), '--json', 'report', 'dashboard', '--post-status')
		expect(JSON.parse(out)).toMatchObject({ posted: true, status_type: 'at_risk', status_update: { gid: 'st1' } })
	})

	it('--dry-run without --post-status is a coded usage error', async () => {
		await expect(run(make(), 'report', 'dashboard', '--dry-run')).rejects.toMatchObject({
			code: 'dry-run-needs-post-status',
		})
	})

	it('--post-status with --page is a coded usage error', async () => {
		await expect(run(make(), 'report', 'dashboard', '--post-status', '--page', 'x.html')).rejects.toMatchObject({
			code: 'post-status-and-page',
		})
	})
})

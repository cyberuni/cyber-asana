import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReferenceAmbiguousError } from '../platform/reference-metadata.js'
import { DEFAULT_SCRUM_POLICY, loadScrumPolicy, parseScrumPolicy, SCRUM_REFERENCE } from './policy.js'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = `${SCRUM_REFERENCE}.md`

async function writeText(path: string, text: string) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, text)
}

describe('parseScrumPolicy', () => {
	it('gives the defaults when no key is set, ignoring the reference own keys', () => {
		expect(parseScrumPolicy({ description: 'x', tags: ['scrum'] })).toEqual(DEFAULT_SCRUM_POLICY)
	})

	it('has the §5.2 defaults', () => {
		expect(DEFAULT_SCRUM_POLICY).toEqual({
			sprint_model: 'sections',
			sprint_length_days: 14,
			sprint_name_format: 'Sprint {n}',
			backlog_section: 'Backlog',
			state_carrier: 'none',
			workflow_states: {
				backlog: 'Backlog',
				ready: 'Ready',
				in_progress: 'In Progress',
				review: 'Review',
				done: 'Done',
			},
			blocked_signals: ['dependency'],
			carry_over: 'move',
			velocity_window: 3,
			hours_per_point: 1,
			working_hours_per_day: 8,
			working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
			standup_window: 'previous_working_day',
		})
		expect(DEFAULT_SCRUM_POLICY).not.toHaveProperty('sprint_anchor_date')
	})

	it('keeps every key set to a valid value', () => {
		const policy = {
			sprint_model: 'custom-field',
			sprint_length_days: 7,
			sprint_anchor_date: '2026-01-05',
			sprint_name_format: '{year} S{n} ({start}–{end})',
			backlog_section: 'Icebox',
			state_carrier: 'field',
			workflow_states: { backlog: 'New', ready: 'Ready', in_progress: 'Doing', review: 'QA', done: 'Shipped' },
			blocked_signals: ['dependency', 'tag:blocked', 'state:review'],
			carry_over: 'leave',
			velocity_window: 5,
			hours_per_point: 0.5,
			working_hours_per_day: 7.5,
			working_days: ['sun', 'mon', 'tue', 'wed', 'thu'],
			standup_window: '2d',
		}
		expect(parseScrumPolicy(policy)).toEqual(policy)
	})

	it('accepts a custom sprint model key', () => {
		expect(parseScrumPolicy({ sprint_model: 'milestones' }).sprint_model).toBe('milestones')
	})

	it('fills the states a partial workflow_states leaves out', () => {
		expect(parseScrumPolicy({ workflow_states: { in_progress: 'Doing' } }).workflow_states).toEqual({
			...DEFAULT_SCRUM_POLICY.workflow_states,
			in_progress: 'Doing',
		})
	})

	it.each([
		['sprint_model', ''],
		['sprint_model', 'Has Spaces'],
		['sprint_length_days', 0],
		['sprint_length_days', 1.5],
		['sprint_length_days', '14'],
		['sprint_anchor_date', '2026-1-5'],
		['sprint_anchor_date', '2026-02-30'],
		['sprint_name_format', ''],
		['sprint_name_format', 'Sprint {number}'],
		['backlog_section', ''],
		['state_carrier', 'tags'],
		['workflow_states', ['backlog']],
		['workflow_states', { blocked: 'Blocked' }],
		['workflow_states', { done: '' }],
		['blocked_signals', 'dependency'],
		['blocked_signals', ['flag']],
		['blocked_signals', ['tag:']],
		['blocked_signals', ['state:blocked']],
		['carry_over', 'drop'],
		['velocity_window', 0],
		['hours_per_point', 0],
		['hours_per_point', -1],
		['working_hours_per_day', 25],
		['working_days', []],
		['working_days', ['monday']],
		['working_days', ['mon', 'mon']],
		['standup_window', 'yesterday'],
		['standup_window', '0d'],
	])('rejects %s = %j, naming the key', (key, value) => {
		expect(() => parseScrumPolicy({ [key]: value })).toThrow(`${SCRUM_REFERENCE}: ${key}`)
	})
})

describe('the shipped cyber-asana.scrum', () => {
	let base: string

	beforeEach(async () => {
		base = await mkdtemp(join(tmpdir(), 'cyber-asana-scrum-'))
		await mkdir(join(base, 'repo', '.git'), { recursive: true })
		await mkdir(join(base, 'home'), { recursive: true })
	})

	afterEach(async () => {
		await rm(base, { recursive: true, force: true })
	})

	function load(packageRoot = PACKAGE_ROOT) {
		return loadScrumPolicy({
			root: join(base, 'repo'),
			home: join(base, 'home'),
			platform: 'linux',
			env: {},
			packageRoot,
		})
	}

	it('states every default the parser gives, so the two cannot drift', async () => {
		expect(await load()).toEqual(DEFAULT_SCRUM_POLICY)
	})

	it('lets a repo copy override one key and keep the rest', async () => {
		await writeText(
			join(base, 'repo', '.agents', 'references', FILE),
			'---\nsprint_length_days: 7\nsprint_anchor_date: 2026-01-05\n---\n',
		)
		expect(await load()).toEqual({ ...DEFAULT_SCRUM_POLICY, sprint_length_days: 7, sprint_anchor_date: '2026-01-05' })
	})

	it('throws on a bad value in a repo copy', async () => {
		await writeText(join(base, 'repo', '.agents', 'references', FILE), '---\ncarry_over: drop\n---\n')
		await expect(load()).rejects.toThrow(`${SCRUM_REFERENCE}: carry_over`)
	})

	it('falls back to the defaults when no tier ships the reference', async () => {
		const empty = join(base, 'empty-plugin')
		await writeText(join(empty, 'package.json'), '{"name":"cyber-asana"}')
		expect(await load(empty)).toEqual(DEFAULT_SCRUM_POLICY)
	})

	it('stops with reference-ambiguous when another plugin also ships it', async () => {
		const repo = join(base, 'repo')
		await writeText(join(repo, 'package.json'), '{"dependencies":{"other-plugin":"1.0.0"}}')
		const other = join(repo, 'node_modules', 'other-plugin')
		await writeText(join(other, 'package.json'), '{"name":"other-plugin","version":"1.0.0"}')
		await writeText(join(other, 'plugin.json'), '{"name":"other-plugin"}')
		await writeText(join(other, 'references', FILE), '---\nsprint_length_days: 7\n---\n\n## Planning\n')
		await expect(load()).rejects.toBeInstanceOf(ReferenceAmbiguousError)
	})
})

import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProjectApi } from './api.js'
import { projectCommand } from './cli.js'
import { createAsanaProjectGateway, type ProjectGateway } from './gateway.js'
import { registerProjectTools } from './mcp.js'
import { buildProjectCreateFields, buildProjectUpdateFields } from './write-options.js'

const SHARED_FIELDS = {
	custom_fields: { cf1: 'x', cf2: 'y' },
	html_custom_fields: { cf3: '<body>hi</body>' },
	custom_type: 'ct1',
	resource_subtype: 'custom',
	icon: 'rocket',
	minimum_access_level_for_customization: 'admin',
	minimum_access_level_for_sharing: 'editor',
} as const

const SHARED_INPUT = {
	customFields: { cf1: 'x' },
	customFieldsJson: '{"cf2":"y"}',
	htmlCustomFieldsJson: '{"cf3":"<body>hi</body>"}',
	customType: 'ct1',
	resourceSubtype: 'custom',
	icon: 'rocket',
	minAccessForCustomization: 'admin',
	minAccessForSharing: 'editor',
} as const

describe('project write fields: write-options', () => {
	it('create maps every field to Asana names, followers as a comma-separated string', () => {
		expect(buildProjectCreateFields({ ...SHARED_INPUT, followerInput: 'me, u2' })).toEqual({
			...SHARED_FIELDS,
			followers: 'me,u2',
		})
		expect(buildProjectCreateFields({ followerGids: ['u1', 'u2'] })).toEqual({ followers: 'u1,u2' })
	})

	it('update maps every field to Asana names and has no followers', () => {
		expect(buildProjectUpdateFields({ ...SHARED_INPUT })).toEqual(SHARED_FIELDS)
	})

	it('merges custom field entries over JSON and html entries over JSON', () => {
		const fields = buildProjectCreateFields({
			customFieldsJson: '{"a":"json"}',
			customFieldEntries: ['a=entry', 'b=2'],
			htmlCustomFieldsJson: '{"h":"<body>j</body>"}',
			htmlCustomFieldEntries: ['h=<body>e</body>'],
		})
		expect(fields.custom_fields).toEqual({ a: 'entry', b: '2' })
		expect(fields.html_custom_fields).toEqual({ h: '<body>e</body>' })
	})

	it('rejects values outside the enums', () => {
		expect(() => buildProjectCreateFields({ icon: 'cat' })).toThrow('icon must be one of: list, board')
		expect(() => buildProjectUpdateFields({ resourceSubtype: 'x' })).toThrow(
			'resource subtype must be one of: default_project, custom',
		)
		expect(() => buildProjectCreateFields({ minAccessForSharing: 'viewer' })).toThrow(
			'minimum access level for sharing must be one of: admin, editor',
		)
		expect(() => buildProjectUpdateFields({ minAccessForCustomization: 'viewer' })).toThrow(
			'minimum access level for customization must be one of: admin, editor',
		)
	})
})

describe('project write fields: gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('createProject sends every new field under Asana names', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'createProject').mockResolvedValue({ data: { gid: 'p1' } } as never)
		await createAsanaProjectGateway({} as Asana.ApiClient).createProject('ws1', 'N', {
			...SHARED_FIELDS,
			followers: 'me',
		})
		expect(Asana.ProjectsApi.prototype.createProject).toHaveBeenCalledWith(
			{ data: { name: 'N', workspace: 'ws1', ...SHARED_FIELDS, followers: 'me' } },
			{},
		)
	})

	it('updateProject sends every new field under Asana names', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'updateProject').mockResolvedValue({ data: { gid: 'p1' } } as never)
		await createAsanaProjectGateway({} as Asana.ApiClient).updateProject('p1', { ...SHARED_FIELDS })
		expect(Asana.ProjectsApi.prototype.updateProject).toHaveBeenCalledWith({ data: SHARED_FIELDS }, 'p1', {})
	})

	it('duplicateProject sends schedule_dates', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'duplicateProject').mockResolvedValue({ data: { gid: 'j1' } } as never)
		await createAsanaProjectGateway({} as Asana.ApiClient).duplicateProject('p1', {
			name: 'S',
			include: ['task_dates'],
			schedule_dates: { should_skip_weekends: true, start_on: '2026-07-01' },
		})
		expect(Asana.ProjectsApi.prototype.duplicateProject).toHaveBeenCalledWith('p1', {
			body: {
				data: {
					name: 'S',
					include: 'task_dates',
					schedule_dates: { should_skip_weekends: true, start_on: '2026-07-01' },
				},
			},
		})
	})

	it('searchProjects sends limit', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'searchProjectsForWorkspace').mockResolvedValue({ data: [] } as never)
		await createAsanaProjectGateway({} as Asana.ApiClient).searchProjects('ws1', { text: 't', limit: 5 })
		expect(Asana.ProjectsApi.prototype.searchProjectsForWorkspace).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ text: 't', limit: 5 }),
		)
	})
})

describe('project duplicate schedule_dates: api validation', () => {
	const duplicateProject = vi.fn().mockResolvedValue({ gid: 'j1' })
	const api = createProjectApi({ duplicateProject } as unknown as ProjectGateway)

	afterEach(() => duplicateProject.mockClear())

	it('passes a valid schedule through', async () => {
		const fields = {
			name: 'S',
			include: ['members', 'task_dates'],
			schedule_dates: { should_skip_weekends: false, due_on: '2026-07-01' },
		}
		await api.duplicateProject('p1', fields)
		expect(duplicateProject).toHaveBeenCalledWith('p1', fields)
	})

	it('rejects both dates before any request', () => {
		expect(() =>
			api.duplicateProject('p1', {
				name: 'S',
				include: ['task_dates'],
				schedule_dates: { should_skip_weekends: false, start_on: '2026-07-01', due_on: '2026-07-09' },
			}),
		).toThrow('schedule dates take exactly one of start_on or due_on')
		expect(duplicateProject).not.toHaveBeenCalled()
	})

	it('rejects no date', () => {
		expect(() =>
			api.duplicateProject('p1', {
				name: 'S',
				include: ['task_dates'],
				schedule_dates: { should_skip_weekends: false },
			}),
		).toThrow('schedule dates take exactly one of start_on or due_on')
	})

	it('rejects a schedule without task_dates in include', () => {
		expect(() =>
			api.duplicateProject('p1', {
				name: 'S',
				include: ['members'],
				schedule_dates: { should_skip_weekends: false, start_on: '2026-07-01' },
			}),
		).toThrow('schedule dates need task_dates in the include list')
		expect(() =>
			api.duplicateProject('p1', {
				name: 'S',
				schedule_dates: { should_skip_weekends: false, start_on: '2026-07-01' },
			}),
		).toThrow('schedule dates need task_dates in the include list')
		expect(duplicateProject).not.toHaveBeenCalled()
	})

	it('duplicateProjectAndWait validates too', async () => {
		await expect(
			api.duplicateProjectAndWait('p1', {
				name: 'S',
				schedule_dates: { should_skip_weekends: false, start_on: '2026-07-01' },
			}),
		).rejects.toThrow('schedule dates need task_dates in the include list')
	})
})

describe('project parameters: cli', () => {
	afterEach(() => vi.restoreAllMocks())

	async function run(args: string[], api: Record<string, unknown>) {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		await new Command().addCommand(projectCommand(api as never)).parseAsync(['node', 'test', 'project', ...args], {
			from: 'node',
		})
	}

	const flags = [
		'--custom-fields-json',
		'{"cf2":"y"}',
		'--custom-field',
		'cf1=x',
		'--html-custom-fields-json',
		'{"cf3":"<body>hi</body>"}',
		'--custom-type',
		'ct1',
		'--resource-subtype',
		'custom',
		'--icon',
		'rocket',
		'--min-access-for-customization',
		'admin',
		'--min-access-for-sharing',
		'editor',
	]

	it('project create forwards the new flags', async () => {
		const createProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		await run(['create', 'N', '--workspace-gid', 'ws1', '--follower', 'me,u2', ...flags], { createProject })
		expect(createProject).toHaveBeenCalledWith(
			'ws1',
			'N',
			{ ...SHARED_FIELDS, custom_fields: { cf2: 'y', cf1: 'x' }, followers: 'me,u2' },
			undefined,
		)
	})

	it('project update forwards the new flags', async () => {
		const updateProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		await run(['update', 'p1', ...flags], { updateProject })
		expect(updateProject).toHaveBeenCalledWith(
			'p1',
			{ ...SHARED_FIELDS, custom_fields: { cf2: 'y', cf1: 'x' } },
			undefined,
		)
	})

	it('project update has no --follower flag', async () => {
		const updateProject = vi.fn()
		await expect(run(['update', 'p1', '--follower', 'me'], { updateProject })).rejects.toThrow()
	})

	it('rejects an unknown icon through commander', async () => {
		const createProject = vi.fn()
		await expect(run(['create', 'N', '--workspace-gid', 'ws1', '--icon', 'cat'], { createProject })).rejects.toThrow()
		expect(createProject).not.toHaveBeenCalled()
	})

	it('project duplicate builds schedule_dates from --schedule-start-on and defaults weekends to false', async () => {
		const duplicateProjectAndWait = vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded' })
		await run(['duplicate', 'p1', '--name', 'S', '--include', 'task_dates', '--schedule-start-on', '2026-07-01'], {
			duplicateProjectAndWait,
		})
		expect(duplicateProjectAndWait).toHaveBeenCalledWith(
			'p1',
			{
				name: 'S',
				include: ['task_dates'],
				schedule_dates: { should_skip_weekends: false, start_on: '2026-07-01' },
			},
			expect.anything(),
		)
	})

	it('project duplicate takes --schedule-due-on with --skip-weekends', async () => {
		const duplicateProject = vi.fn().mockResolvedValue({ gid: 'j1' })
		await run(
			[
				'duplicate',
				'p1',
				'--name',
				'S',
				'--no-wait',
				'--include',
				'task_dates',
				'--schedule-due-on',
				'2026-07-09',
				'--skip-weekends',
			],
			{ duplicateProject },
		)
		expect(duplicateProject).toHaveBeenCalledWith('p1', {
			name: 'S',
			include: ['task_dates'],
			schedule_dates: { should_skip_weekends: true, due_on: '2026-07-09' },
		})
	})

	it('project duplicate rejects --skip-weekends without a schedule date', async () => {
		const duplicateProject = vi.fn()
		await expect(run(['duplicate', 'p1', '--name', 'S', '--skip-weekends'], { duplicateProject })).rejects.toThrow(
			'--skip-weekends needs --schedule-start-on or --schedule-due-on',
		)
		expect(duplicateProject).not.toHaveBeenCalled()
	})

	it('project search forwards --limit', async () => {
		const searchProjects = vi.fn().mockResolvedValue([])
		await run(['search', 'x', '--workspace-gid', 'ws1', '--limit', '7'], { searchProjects })
		expect(searchProjects).toHaveBeenCalledWith('ws1', expect.objectContaining({ limit: 7 }))
	})
})

describe('project parameters: mcp', () => {
	function setup(api: Record<string, unknown>) {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		registerProjectTools(
			{ tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) } as never,
			api as never,
		)
		return handlers
	}

	const params = {
		custom_fields: { cf1: 'x', cf2: 'y' },
		html_custom_fields: { cf3: '<body>hi</body>' },
		custom_type: 'ct1',
		resource_subtype: 'custom',
		icon: 'rocket',
		minimum_access_level_for_customization: 'admin',
		minimum_access_level_for_sharing: 'editor',
	}

	it('asana_project_create forwards the new fields, followers as array or string', async () => {
		const createProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const handlers = setup({ createProject })
		await handlers.get('asana_project_create')?.({
			workspace_gid: 'ws1',
			name: 'N',
			follower_gids: ['me', 'u2'],
			...params,
		})
		expect(createProject).toHaveBeenLastCalledWith('ws1', 'N', { ...SHARED_FIELDS, followers: 'me,u2' }, undefined)
		await handlers.get('asana_project_create')?.({ workspace_gid: 'ws1', name: 'N', follower_gids: 'u1, u3' })
		expect(createProject).toHaveBeenLastCalledWith('ws1', 'N', { followers: 'u1,u3' }, undefined)
	})

	it('asana_project_update forwards the new fields', async () => {
		const updateProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		await setup({ updateProject }).get('asana_project_update')?.({ project_gid: 'p1', ...params })
		expect(updateProject).toHaveBeenCalledWith('p1', SHARED_FIELDS, undefined)
	})

	it('asana_project_duplicate forwards schedule_dates and the api validates it', async () => {
		const duplicateProjectAndWait = vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded' })
		const schedule_dates = { should_skip_weekends: true, due_on: '2026-07-09' }
		await setup({ duplicateProjectAndWait }).get('asana_project_duplicate')?.({
			project_gid: 'p1',
			name: 'S',
			include: ['task_dates'],
			schedule_dates,
		})
		expect(duplicateProjectAndWait).toHaveBeenCalledWith(
			'p1',
			{ name: 'S', include: ['task_dates'], schedule_dates },
			expect.anything(),
		)
	})

	it('asana_project_search forwards limit', async () => {
		const searchProjects = vi.fn().mockResolvedValue([])
		await setup({ searchProjects }).get('asana_project_search')?.({ workspace_gid: 'ws1', limit: 9 })
		expect(searchProjects).toHaveBeenCalledWith('ws1', expect.objectContaining({ limit: 9 }))
	})
})

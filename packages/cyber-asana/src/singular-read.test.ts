import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Repo-wide convention (#179): every singular read — `GET /<resource>/{gid}` —
 * accepts `opt_fields`, exposed as `--opt-fields` on the CLI `get` command and
 * `opt_fields` on the MCP `*_get` tool. Absent fields leave the read unchanged.
 */
type SingularRead = {
	/** Domain directory under `src/`. */
	dir: string
	/** Gateway/API method name. */
	method: string
	/** Leading arguments the gateway/API method takes before the read options. */
	args: string[]
	/** Asana SDK class and method the gateway calls. */
	sdk: [keyof typeof Asana, string]
	/** Arguments the SDK method receives before its opts. */
	sdkArgs: string[]
	/** `opt_fields` the gateway sends when none are requested; `undefined` means none. */
	defaultOptFields?: string
	gatewayFactory: string
	apiFactory: string
	commandFactory: string
	/** CLI argv after the resource command, e.g. `['get', '1']`. */
	cli: string[]
	registerTools: string
	tool: string
	/** MCP params identifying the resource. */
	mcp: Record<string, string>
}

function read(
	dir: string,
	entity: string,
	opts: Partial<SingularRead> & { cliName: string; tool: string; gidParam: string; sdk: SingularRead['sdk'] },
): SingularRead {
	const { cliName, gidParam, ...rest } = opts
	return {
		dir,
		method: `get${entity}`,
		args: ['1'],
		sdkArgs: ['1'],
		gatewayFactory: `createAsana${entity}Gateway`,
		apiFactory: `create${entity}Api`,
		commandFactory: `${entity.charAt(0).toLowerCase()}${entity.slice(1)}Command`,
		cli: [cliName, 'get', '1'],
		registerTools: `register${entity}Tools`,
		mcp: { [gidParam]: '1' },
		...rest,
	}
}

const READS: SingularRead[] = [
	read('attachments', 'Attachment', {
		cliName: 'attachment',
		tool: 'asana_attachment_get',
		gidParam: 'attachment_gid',
		sdk: ['AttachmentsApi', 'getAttachment'],
	}),
	read('custom-fields', 'CustomField', {
		cliName: 'custom-field',
		tool: 'asana_custom_field_get',
		gidParam: 'custom_field_gid',
		sdk: ['CustomFieldsApi', 'getCustomField'],
	}),
	read('goals', 'Goal', {
		cliName: 'goal',
		tool: 'asana_goal_get',
		gidParam: 'goal_gid',
		sdk: ['GoalsApi', 'getGoal'],
	}),
	read('jobs', 'Job', { cliName: 'job', tool: 'asana_job_get', gidParam: 'job_gid', sdk: ['JobsApi', 'getJob'] }),
	read('ooo', 'Ooo', {
		method: 'getOooEntry',
		cliName: 'ooo',
		tool: 'asana_ooo_get',
		gidParam: 'ooo_entry_gid',
		sdk: ['OooEntriesApi', 'getOooEntry'],
	}),
	read('portfolios', 'Portfolio', {
		cliName: 'portfolio',
		tool: 'asana_portfolio_get',
		gidParam: 'portfolio_gid',
		sdk: ['PortfoliosApi', 'getPortfolio'],
	}),
	read('project-templates', 'ProjectTemplate', {
		cliName: 'project-template',
		tool: 'asana_project_template_get',
		gidParam: 'project_template_gid',
		sdk: ['ProjectTemplatesApi', 'getProjectTemplate'],
	}),
	read('projects', 'Project', {
		cliName: 'project',
		tool: 'asana_project_get',
		gidParam: 'project_gid',
		sdk: ['ProjectsApi', 'getProject'],
	}),
	read('sections', 'Section', {
		cliName: 'section',
		tool: 'asana_section_get',
		gidParam: 'section_gid',
		sdk: ['SectionsApi', 'getSection'],
	}),
	read('status', 'Status', {
		cliName: 'status',
		tool: 'asana_status_get',
		gidParam: 'status_gid',
		sdk: ['StatusUpdatesApi', 'getStatus'],
	}),
	read('stories', 'Story', {
		cliName: 'story',
		tool: 'asana_story_get',
		gidParam: 'story_gid',
		sdk: ['StoriesApi', 'getStory'],
	}),
	read('tags', 'Tag', { cliName: 'tag', tool: 'asana_tag_get', gidParam: 'tag_gid', sdk: ['TagsApi', 'getTag'] }),
	read('task-templates', 'TaskTemplate', {
		cliName: 'task-template',
		tool: 'asana_task_template_get',
		gidParam: 'task_template_gid',
		sdk: ['TaskTemplatesApi', 'getTaskTemplate'],
	}),
	read('tasks', 'Task', {
		cliName: 'task',
		tool: 'asana_task_get',
		gidParam: 'task_gid',
		sdk: ['TasksApi', 'getTask'],
		defaultOptFields: expect.stringContaining('gid,name,notes') as unknown as string,
	}),
	read('teams', 'Team', {
		cliName: 'team',
		tool: 'asana_team_get',
		gidParam: 'team_gid',
		sdk: ['TeamsApi', 'getTeam'],
	}),
	read('users', 'User', {
		cliName: 'user',
		tool: 'asana_user_get',
		gidParam: 'user_gid',
		sdk: ['UsersApi', 'getUser'],
	}),
	read('users', 'User', {
		method: 'getMe',
		args: [],
		sdkArgs: ['me'],
		cli: ['user', 'me'],
		cliName: 'user',
		tool: 'asana_user_me',
		gidParam: 'unused',
		mcp: {},
		sdk: ['UsersApi', 'getUser'],
	}),
	read('workspaces', 'Workspace', {
		cliName: 'workspace',
		tool: 'asana_workspace_get',
		gidParam: 'workspace_gid',
		sdk: ['WorkspacesApi', 'getWorkspace'],
	}),
]

function load(dir: string, file: 'gateway' | 'api' | 'cli' | 'mcp'): Promise<Record<string, any>> {
	return import(/* @vite-ignore */ `./${dir}/${file}.js`)
}

/** A double that answers any method with a resource, recording each call. */
function anyMethodDouble() {
	const fns: Record<string, ReturnType<typeof vi.fn>> = {}
	const target = new Proxy(fns, {
		get(t, key: string) {
			if (key === 'then') return undefined
			t[key] ??= vi.fn().mockResolvedValue({ gid: '1', name: 'x' })
			return t[key]
		},
	})
	return target as Record<string, any>
}

describe.each(READS.map((r) => [`${r.dir} ${r.method}`, r] as const))('singular read %s', (_name, r) => {
	const originalArgv = [...process.argv]

	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	describe('gateway', () => {
		function stubSdk() {
			const [apiClass, method] = r.sdk
			return vi
				.spyOn((Asana[apiClass] as any).prototype, method)
				.mockResolvedValue({ data: { gid: '1', name: 'x' } } as never)
		}

		it('sends requested fields as opt_fields', async () => {
			const spy = stubSdk()
			const gatewayModule = await load(r.dir, 'gateway')
			const gateway = gatewayModule[r.gatewayFactory]({} as Asana.ApiClient)

			await gateway[r.method](...r.args, { optFields: 'name,notes' })

			expect(spy).toHaveBeenCalledWith(...r.sdkArgs, { opt_fields: 'name,notes' })
		})

		it('keeps the existing read shape when no fields are requested', async () => {
			const spy = stubSdk()
			const gatewayModule = await load(r.dir, 'gateway')
			const gateway = gatewayModule[r.gatewayFactory]({} as Asana.ApiClient)

			await gateway[r.method](...r.args)

			expect(spy).toHaveBeenCalledWith(
				...r.sdkArgs,
				r.defaultOptFields === undefined ? {} : { opt_fields: r.defaultOptFields },
			)
		})
	})

	it('api forwards read options to the gateway', async () => {
		const gateway = anyMethodDouble()
		const apiModule = await load(r.dir, 'api')
		const api = apiModule[r.apiFactory](gateway)

		await api[r.method](...r.args, { optFields: 'name' })

		expect(gateway[r.method]).toHaveBeenCalledWith(...r.args, { optFields: 'name' })
	})

	it('CLI --opt-fields reaches the api', async () => {
		const api = anyMethodDouble()
		const cliModule = await load(r.dir, 'cli')
		const command = r.dir === 'stories' ? cliModule[r.commandFactory]('story', api) : cliModule[r.commandFactory](api)
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(command)

		await program.parseAsync(['node', 'test', '--json', ...r.cli, '--opt-fields', 'name'], { from: 'node' })

		expect(api[r.method]).toHaveBeenCalledWith(...r.args, { optFields: 'name' })
	})

	it('MCP opt_fields reaches the api', async () => {
		const api = anyMethodDouble()
		const handlers = new Map<string, (params: any) => Promise<any>>()
		const server = {
			tool(name: string, _description: string, _schema: unknown, handler: (params: any) => Promise<any>) {
				handlers.set(name, handler)
			},
		}
		const mcpModule = await load(r.dir, 'mcp')
		mcpModule[r.registerTools](server, api)

		await handlers.get(r.tool)?.({ ...r.mcp, opt_fields: 'name' })

		expect(api[r.method]).toHaveBeenCalledWith(...r.args, { optFields: 'name' })
	})
})

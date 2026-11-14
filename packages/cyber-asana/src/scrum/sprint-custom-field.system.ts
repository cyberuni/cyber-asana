import Asana from 'asana'
import { afterAll, beforeAll, describe } from 'vitest'
import { createAsanaCustomFieldGateway } from '../custom-fields/gateway.js'
import { createClient } from '../platform/client.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import { createAsanaSectionGateway } from '../sections/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { isPaidPlan, isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { createAsanaUserGateway } from '../users/gateway.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintCustomFieldAcceptanceSpecs } from './sprint-custom-field.acceptance.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
// Task search is premium, and so are custom fields.
const enabled = isSystemTestEnabled() && isPaidPlan() && Boolean(workspaceGid && projectGid)

function live(sprintFieldGid: string) {
	const client = createClient()
	const tasks = createAsanaTaskGateway(client)
	const customFields = createAsanaCustomFieldGateway(client)
	const api = createScrumApi({
		store: () => ({
			load: async () => ({
				scopes: [{ name: 'system', kind: 'project' as const, projects: [projectGid as string], default: true }],
				sources: {},
				// The probe field has no name the discovery matcher knows, so register it as the sprint role.
				fields: { [projectGid as string]: { sprint: { gid: sprintFieldGid, name: 'probe' } } },
			}),
			add: async () => {
				throw new Error('read-only')
			},
			remove: async () => {
				throw new Error('read-only')
			},
		}),
		gateways: { portfolios: createAsanaPortfolioGateway(client), tasks },
		sprint: {
			sections: createAsanaSectionGateway(client),
			tasks,
			users: createAsanaUserGateway(client),
			fieldModel: { customFields, tasks, projects: createAsanaProjectGateway(client) },
		},
		dependencies: tasks,
		loadPolicy: async () => ({
			...DEFAULT_SCRUM_POLICY,
			sprint_anchor_date: '2026-01-05',
			sprint_model: 'custom-field',
		}),
	})
	return { api, tasks, customFields }
}

type Live = ReturnType<typeof live>
let fieldGid: string | undefined
let cached: Live | undefined
const get = () => {
	if (!cached) throw new Error('the probe field is not created yet')
	return cached
}

// The `custom-field` sprint model against live Asana: option create, a task's Sprint field set, and
// task search on `custom_fields.{gid}.value` and `.is_set`. It makes a probe enum field, attaches it to
// the system test project, and deletes it afterwards. Search is eventually consistent, so reads retry.
describe.skipIf(!enabled)('scrum/sprint custom-field system', () => {
	beforeAll(async () => {
		const client = createClient()
		const field = await createAsanaCustomFieldGateway(client).createCustomField({
			workspace: workspaceGid as string,
			name: `cyber-asana sprint probe ${Date.now()}`,
			resourceSubtype: 'enum',
		})
		fieldGid = field.gid
		await createAsanaCustomFieldGateway(client).addCustomFieldToProject(projectGid as string, field.gid)
		cached = live(field.gid)
	})
	afterAll(async () => {
		if (fieldGid) await new Asana.CustomFieldsApi(createClient()).deleteCustomField(fieldGid)
	})

	defineSprintCustomFieldAcceptanceSpecs({
		getApi: () => get().api,
		settleMs: 60_000,
		createTask: async (name) =>
			(await get().tasks.createTask(workspaceGid as string, name, { projects: [projectGid as string] })).gid,
		sprintOf: async (taskGid) => {
			const task = (await get().tasks.getTask(taskGid, {
				optFields: 'custom_fields.gid,custom_fields.enum_value.name',
			})) as unknown as { custom_fields?: Array<{ gid?: string; enum_value?: { name?: string } | null }> }
			return task.custom_fields?.find((f) => f.gid === fieldGid)?.enum_value?.name
		},
		deleteTask: (taskGid) => get().tasks.deleteTask(taskGid),
		disableOptions: async (names) => {
			const field = (await get().customFields.getCustomField(fieldGid as string, {
				optFields: 'enum_options.gid,enum_options.name',
			})) as { enum_options?: Array<{ gid: string; name?: string }> }
			for (const o of field.enum_options ?? []) {
				if (o.name && names.includes(o.name)) await get().customFields.updateEnumOption(o.gid, { enabled: false })
			}
		},
	})()
})

import Asana from 'asana'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '../platform/client.js'
import { buildErrorBody } from '../platform/error-body.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import { createAsanaStatusGateway } from '../status/gateway.js'
import { createAsanaStoryGateway } from '../stories/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { classifyReadBack, type ProbeOutcome, REJECTED_SAMPLE, SUPPORTED_SAMPLE } from './probe-samples.js'
import { KNOWN_REJECTED_TAGS, SURFACE_RULES, type Surface } from './surfaces.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const enabled = isSystemTestEnabled() && Boolean(workspaceGid)

// Each surface takes the same one-tag-at-a-time probe: write `<body>sample</body>`, read it back,
// and record whether Asana kept it, refused it (with its message) or stored it as literal text.
// The result is checked against the rule table, so a rule with no probe behind it cannot stand;
// when it fails, the message names each tag where the table and Asana disagree.
// Everything it creates is a scratch task or project the suite deletes; a crashed run leaves the
// task in My Tasks and the project under the caller's own projects.

type Write = (html: string) => Promise<string>

const ALL_TAGS: [tag: string, sample: string][] = [
	...Object.entries(SUPPORTED_SAMPLE).map(([key, sample]) => [key.slice(1, -1), sample] as [string, string]),
	...KNOWN_REJECTED_TAGS.map((tag) => [tag, REJECTED_SAMPLE[`<${tag}>`] as string] as [string, string]),
]

async function probeTag(write: Write, sample: string): Promise<ProbeOutcome> {
	try {
		return classifyReadBack(await write(`<body>${sample}</body>`))
	} catch (error) {
		return { outcome: 'rejected', message: buildErrorBody(error).error.message }
	}
}

async function probeSurface(write: Write): Promise<Record<string, ProbeOutcome>> {
	const observed: Record<string, ProbeOutcome> = {}
	for (const [tag, sample] of ALL_TAGS) {
		// <body> wraps plain text: that sample is the control, not a tag.
		observed[tag] = await probeTag(write, sample)
	}
	return observed
}

/** Tags where the table's claim and Asana's behavior disagree; empty when the table is true. */
function disagreements(surface: Surface, observed: Record<string, ProbeOutcome>): string[] {
	const rule = SURFACE_RULES[surface]
	const allowed = new Set(rule.allowed)
	return Object.entries(observed).flatMap(([tag, result]) => {
		const kept = result.outcome === 'accepted'
		if (allowed.has(tag) && !kept)
			return [`<${tag}> is allowed on ${surface} but Asana answered ${JSON.stringify(result)}`]
		if (!allowed.has(tag) && kept) return [`<${tag}> is refused on ${surface} but Asana kept it`]
		return []
	})
}

describe.skipIf(!enabled)('Asana HTML rules per surface (system)', { timeout: 300_000 }, () => {
	const client = enabled ? createClient() : (undefined as unknown as Asana.ApiClient)
	let taskGid = ''
	let projectGid = ''

	beforeAll(async () => {
		// Assigned to the caller so a crashed run leaves the scratch task in My Tasks.
		const task = await createAsanaTaskGateway(client).createTask(
			workspaceGid as string,
			'[cyber-asana system test] html comment probe',
			{ assignee: 'me' },
		)
		taskGid = String(task.gid)
		const project = await createAsanaProjectGateway(client).createProject(
			workspaceGid as string,
			'[cyber-asana system test] html probe',
		)
		projectGid = String(project.gid)
	})

	afterAll(async () => {
		if (taskGid) await createAsanaTaskGateway(client).deleteTask(taskGid)
		if (projectGid) await createAsanaProjectGateway(client).deleteProject(projectGid)
	})

	it('comment: probes every tag on a story', async () => {
		const stories = createAsanaStoryGateway(client)
		const observed = await probeSurface(async (html) => {
			const story = await stories.createStory(taskGid, { html_text: html })
			try {
				const read = await stories.getStory(String(story.gid), { optFields: 'html_text' })
				return String(read.html_text ?? '')
			} finally {
				await stories.deleteStory(String(story.gid))
			}
		})
		expect(disagreements('comment', observed)).toEqual([])
	})

	it('project-brief: probes every tag on a brief', async () => {
		const briefs = new Asana.ProjectBriefsApi(client)
		const created = await briefs
			.createProjectBrief({ data: { html_text: '<body>probe</body>' } }, projectGid, {})
			.catch((error) => {
				throw new Error(buildErrorBody(error).error.message)
			})
		const briefGid = String(created.data.gid)
		try {
			const observed = await probeSurface(async (html) => {
				await briefs.updateProjectBrief({ data: { html_text: html } }, briefGid, {})
				const read = await briefs.getProjectBrief(briefGid, { opt_fields: 'html_text' })
				return String(read.data.html_text ?? '')
			})
			expect(disagreements('project-brief', observed)).toEqual([])
		} finally {
			await briefs.deleteProjectBrief(briefGid)
		}
	})

	it('status-update: probes every tag on a project status update', async () => {
		const statuses = createAsanaStatusGateway(client)
		// A status update cannot be edited, so each tag is its own create and delete.
		const observed = await probeSurface(async (html) => {
			const status = await statuses.createStatus(projectGid, {
				status_type: 'on_track',
				title: 'cyber-asana html probe',
				html_text: html,
			})
			try {
				const read = await statuses.getStatus(String(status.gid), { optFields: 'html_text' })
				return String(read.html_text ?? '')
			} finally {
				await statuses.deleteStatus(String(status.gid))
			}
		})
		expect(disagreements('status-update', observed)).toEqual([])
	})
})

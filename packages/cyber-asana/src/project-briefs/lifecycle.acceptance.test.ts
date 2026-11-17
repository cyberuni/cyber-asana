import { describe } from 'vitest'
import { createProjectBriefApi } from './api.js'
import type { ProjectBriefGateway } from './gateway.js'
import { defineProjectBriefLifecycleAcceptanceSpecs } from './lifecycle.acceptance.js'

type Brief = { gid: string; title?: string; text?: string; html_text?: string }

/** A gateway double that keeps briefs in a map, so the lifecycle spec runs without the SDK. */
function createBriefGateway(): ProjectBriefGateway {
	let next = 1
	const briefs = new Map<string, Brief>()
	const find = (gid: string) => {
		const brief = briefs.get(gid)
		if (!brief) throw Object.assign(new Error('Not Found'), { status: 404 })
		return brief
	}
	return {
		createProjectBrief: async (_projectGid, fields) => {
			const brief = { gid: `b${next++}`, ...fields }
			briefs.set(brief.gid, brief)
			return { ...brief }
		},
		getProjectBrief: async (gid) => ({ ...find(gid) }),
		updateProjectBrief: async (gid, fields) => {
			const brief = Object.assign(find(gid), fields)
			return { ...brief }
		},
		deleteProjectBrief: async (gid) => {
			briefs.delete(gid)
		},
	}
}

describe(
	'project-briefs/lifecycle acceptance',
	defineProjectBriefLifecycleAcceptanceSpecs({
		getApi: () => createProjectBriefApi(createBriefGateway()),
		projectGid: 'p1',
	}),
)

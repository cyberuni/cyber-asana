import { createRuntimeContext } from '../composition.js'
import { systemEnv } from './system.js'
import { ensureSystemFixtures, formatFixtureEnv } from './system-fixtures.js'

const projectGid = process.argv[2] ?? systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const workspaceGid = systemEnv('ASANA_WORKSPACE')
const target = projectGid ? { projectGid } : workspaceGid ? { workspaceGid } : undefined
if (!target) {
	console.error('usage: pnpm test:system:setup [project-gid]  (without one, set ASANA_WORKSPACE_GID)')
	process.exit(2)
}

console.log(formatFixtureEnv(await ensureSystemFixtures(createRuntimeContext(), target)))

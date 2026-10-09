import { createRuntimeContext } from '../composition.js'
import { systemEnv } from './system.js'
import { ensureSystemFixtures, formatFixtureEnv } from './system-fixtures.js'

const projectGid = process.argv[2] ?? systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
if (!projectGid) {
	console.error('usage: pnpm test:system:setup <project-gid>  (or set ASANA_SYSTEM_TEST_PROJECT_GID)')
	process.exit(2)
}

const fixtures = await ensureSystemFixtures(createRuntimeContext(), projectGid)
console.log(formatFixtureEnv(fixtures))

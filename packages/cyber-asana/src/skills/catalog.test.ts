import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
	type CatalogRule,
	type CatalogSources,
	type CatalogViolation,
	collectCatalogViolations,
	repoCatalogSources,
} from './catalog.js'

/**
 * The frozen suite is `.agents/spec/skills/skills.feature`; each `it` below is one of its
 * scenarios, and the describes are its use-case groups.
 */

const TRIGGER = 'Use this skill when the user wants a standup update from Asana.'

type SkillFixture = Record<string, string>

type Fixture = {
	/** skill directory name → (path relative to that directory → contents) */
	skills?: Record<string, SkillFixture>
	/** `files` allowlist written into the package manifest */
	allowlist?: string[]
	/** `skills` field written into the plugin manifest */
	pointer?: string
	/** skills each published table names; defaults to every fixture skill */
	readmeLists?: string[]
	docsIndexLists?: string[]
	/** SETUP.md at the plugin root; `null` writes no file at all */
	setup?: string | null
}

function frontBlock(fields: Record<string, string>): string {
	const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
	return `---\n${lines.join('\n')}\n---\n\n# A skill\n`
}

const conforming: Record<string, SkillFixture> = {
	'asana-standup': { 'SKILL.md': frontBlock({ name: 'asana-standup', description: TRIGGER }) },
}

/** Hands off to a skill the fixture ships, so the default fixture reports nothing. */
const conformingSetup = '# Setup\n\nThe rest lives in [asana-standup](./skills/asana-standup/SKILL.md).\n'

const temporary: string[] = []

afterEach(async () => {
	await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function build(fixture: Fixture): Promise<CatalogSources> {
	const root = await mkdtemp(path.join(tmpdir(), 'cyber-asana-catalog-'))
	temporary.push(root)

	const skills = fixture.skills ?? conforming
	const names = Object.keys(skills)
	const skillsRoot = path.join(root, 'skills')

	for (const [name, files] of Object.entries(skills)) {
		for (const [relative, contents] of Object.entries(files)) {
			const target = path.join(skillsRoot, name, relative)
			await mkdir(path.dirname(target), { recursive: true })
			await writeFile(target, contents)
		}
	}

	if (fixture.setup !== null) await writeFile(path.join(root, 'SETUP.md'), fixture.setup ?? conformingSetup)

	await writeFile(
		path.join(root, 'package.json'),
		JSON.stringify({ files: fixture.allowlist ?? ['dist', 'skills', 'SETUP.md'] }),
	)
	await mkdir(path.join(root, '.plugin'), { recursive: true })
	await writeFile(path.join(root, '.plugin', 'plugin.json'), JSON.stringify({ skills: fixture.pointer ?? './skills/' }))

	const table = (listed: string[]) => `| Skill |\n|---|\n${listed.map((name) => `| ${name} |`).join('\n')}\n`
	await writeFile(path.join(root, 'readme.md'), table(fixture.readmeLists ?? names))
	const docsIndex = path.join(root, 'apps/web/src/content/docs/skills')
	await mkdir(docsIndex, { recursive: true })
	await writeFile(path.join(docsIndex, 'index.md'), table(fixture.docsIndexLists ?? names))

	return {
		skillsRoot,
		repoRoot: root,
		packageJsonPath: path.join(root, 'package.json'),
		pluginManifestPath: path.join(root, '.plugin', 'plugin.json'),
		setupPath: path.join(root, 'SETUP.md'),
		docsListings: ['readme.md', 'apps/web/src/content/docs/skills/index.md'],
	}
}

async function violations(fixture: Fixture): Promise<CatalogViolation[]> {
	return collectCatalogViolations(await build(fixture))
}

async function violationsFor(rule: CatalogRule, fixture: Fixture): Promise<CatalogViolation[]> {
	return (await violations(fixture)).filter((violation) => violation.rule === rule)
}

describe('the shipped catalog', () => {
	it('satisfies every rule of the contract', async () => {
		const found = await collectCatalogViolations(repoCatalogSources())
		expect(found.map((violation) => violation.message)).toEqual([])
	})

	it('covers all seven shipped skills', async () => {
		// A contract that silently checked nothing would also report no violations.
		const { skillsRoot } = repoCatalogSources()
		const entries = await readdir(skillsRoot, { withFileTypes: true })
		expect(entries.filter((entry) => entry.isDirectory())).toHaveLength(7)
	})
})

describe('loading a skill', () => {
	it('a skill whose declared name matches its directory is accepted', async () => {
		expect(await violations({})).toEqual([])
	})

	it('a SKILL.md with no front block is rejected by skill name', async () => {
		const found = await violationsFor('front-block', {
			skills: { 'asana-standup': { 'SKILL.md': '# Asana Standup\n' } },
		})
		expect(found).toHaveLength(1)
		expect(found[0].skill).toBe('asana-standup')
	})

	it('a skill whose declared name differs from its directory is rejected', async () => {
		const found = await violationsFor('name-matches-directory', {
			skills: { 'asana-standup': { 'SKILL.md': frontBlock({ name: 'standup', description: TRIGGER }) } },
		})
		expect(found).toHaveLength(1)
		expect(found[0].skill).toBe('asana-standup')
	})

	it('a skill with no description is rejected by skill name', async () => {
		const found = await violationsFor('description-present', {
			skills: { 'asana-standup': { 'SKILL.md': frontBlock({ name: 'asana-standup' }) } },
		})
		expect(found).toHaveLength(1)
		expect(found[0].skill).toBe('asana-standup')
	})

	it('a description that says when the skill applies is accepted', async () => {
		expect(await violationsFor('description-trigger-language', {})).toEqual([])
	})

	it('a description that never says when to use the skill is rejected', async () => {
		const found = await violationsFor('description-trigger-language', {
			skills: {
				'asana-standup': {
					'SKILL.md': frontBlock({
						name: 'asana-standup',
						description: 'A standup update built from recent Asana activity.',
					}),
				},
			},
		})
		expect(found).toHaveLength(1)
		expect(found[0].skill).toBe('asana-standup')
	})

	it('a description at the 120-character budget is accepted', async () => {
		expect(await violationsFor('description-budget', { skills: describedIn(120) })).toEqual([])
	})

	it('a description over the budget is rejected with its character count', async () => {
		const found = await violationsFor('description-budget', { skills: describedIn(121) })
		expect(found).toHaveLength(1)
		expect(found[0].length).toBe(121)
	})
})

/** A conforming front block whose description is exactly `length` characters. */
function describedIn(length: number): Record<string, SkillFixture> {
	const opening = 'Use this skill when '
	const description = opening + 'x'.repeat(length - opening.length)
	return { 'asana-standup': { 'SKILL.md': frontBlock({ name: 'asana-standup', description }) } }
}

describe('following a reference', () => {
	const body = (extra: string) => frontBlock({ name: 'improve-description', description: TRIGGER }) + extra

	it('a reference the skill ships is accepted', async () => {
		const found = await violationsFor('reference-resolves', {
			skills: {
				'improve-description': {
					'SKILL.md': body('\nSee `references/templates.md` for the templates.\n'),
					'references/templates.md': '# Templates\n',
				},
			},
		})
		expect(found).toEqual([])
	})

	it('a reference the skill names but does not ship is rejected by file name', async () => {
		const found = await violationsFor('reference-resolves', {
			skills: {
				'improve-description': { 'SKILL.md': body('\nSee `references/templates.md` for the templates.\n') },
			},
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('references/templates.md')
	})
})

describe('running a prescribed command', () => {
	const withCommand = (skill: string, files: SkillFixture) => ({ [skill]: files })
	const skillMd = (skill: string, extra: string) => frontBlock({ name: skill, description: TRIGGER }) + extra

	it('an invocation pinned to a version is accepted', async () => {
		const found = await violationsFor('npx-pinned', {
			skills: withCommand('asana-standup', {
				'SKILL.md': skillMd('asana-standup', '\n```sh\nnpx cyber-asana@0.9.0 task list\n```\n'),
			}),
		})
		expect(found).toEqual([])
	})

	it('an unpinned invocation is rejected by file name', async () => {
		const found = await violationsFor('npx-pinned', {
			skills: withCommand('asana-standup', {
				'SKILL.md': skillMd('asana-standup', '\n```sh\nnpx cyber-asana task list\n```\n'),
			}),
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('SKILL.md')
	})

	it('an unpinned invocation abbreviating --yes to -y is rejected', async () => {
		const found = await violationsFor('npx-pinned', {
			skills: withCommand('asana-standup', {
				'SKILL.md': skillMd('asana-standup', '\n```sh\nnpx -y cyber-asana task list\n```\n'),
			}),
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('SKILL.md')
	})

	it('an unpinned invocation inside a reference file is rejected by file name', async () => {
		const found = await violationsFor('npx-pinned', {
			skills: withCommand('improve-description', {
				'SKILL.md': skillMd('improve-description', '\nNothing to run here.\n'),
				'references/templates.md': '```sh\nnpx --yes cyber-asana task list\n```\n',
			}),
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('references/templates.md')
	})
})

describe('discovering the catalog', () => {
	it('a skill listed in both published tables is accepted', async () => {
		expect(await violationsFor('docs-listing', {})).toEqual([])
	})

	it('a skill missing from the readme table is rejected naming the readme', async () => {
		const found = await violationsFor('docs-listing', { readmeLists: [] })
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('readme.md')
		expect(found[0].skill).toBe('asana-standup')
	})

	it('a skill missing from the docs site index is rejected naming that page', async () => {
		const found = await violationsFor('docs-listing', { docsIndexLists: [] })
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('apps/web/src/content/docs/skills/index.md')
	})
})

describe('finishing a plugin install', () => {
	it('a SETUP.md at the plugin root is accepted', async () => {
		expect(await violationsFor('setup-present', {})).toEqual([])
	})

	it('a plugin root with no SETUP.md is rejected naming the file', async () => {
		const found = await violationsFor('setup-present', { setup: null })
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('SETUP.md')
	})

	it('a handoff SETUP.md links to a shipped skill is accepted', async () => {
		expect(await violationsFor('setup-link-resolves', {})).toEqual([])
	})

	it('a handoff SETUP.md links to but does not ship is rejected by target', async () => {
		const found = await violationsFor('setup-link-resolves', {
			setup: '# Setup\n\nThe rest lives in [init](./skills/init-asana/SKILL.md).\n',
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('./skills/init-asana/SKILL.md')
	})

	it('an absolute link out of SETUP.md is left alone', async () => {
		const found = await violationsFor('setup-link-resolves', {
			setup: '# Setup\n\nSee [Asana](https://app.asana.com/) for the token.\n',
		})
		expect(found).toEqual([])
	})

	it('an unpinned invocation in SETUP.md is rejected naming SETUP.md', async () => {
		const found = await violationsFor('npx-pinned', {
			setup: '# Setup\n\n```sh\nnpx cyber-asana workspace list\n```\n',
		})
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('SETUP.md')
	})

	it('a SETUP.md on the publish allowlist is accepted', async () => {
		expect(await violationsFor('setup-allowlist', { allowlist: ['dist', 'skills', 'SETUP.md'] })).toEqual([])
	})

	it('a SETUP.md absent from the publish allowlist is rejected naming the manifest', async () => {
		const found = await violationsFor('setup-allowlist', { allowlist: ['dist', 'skills'] })
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('package.json')
	})
})

describe('publishing the catalog', () => {
	it('a skills directory on the publish allowlist is accepted', async () => {
		expect(await violationsFor('publish-allowlist', { allowlist: ['dist', 'skills'] })).toEqual([])
	})

	it('a skills directory absent from the publish allowlist is rejected', async () => {
		expect(await violationsFor('publish-allowlist', { allowlist: ['dist'] })).toHaveLength(1)
	})

	it('a plugin manifest pointing at the shipped directory is accepted', async () => {
		expect(await violationsFor('manifest-skills-pointer', { pointer: './skills/' })).toEqual([])
	})

	it('a plugin manifest pointing away from the shipped directory is rejected', async () => {
		const found = await violationsFor('manifest-skills-pointer', { pointer: './agent-skills/' })
		expect(found).toHaveLength(1)
		expect(found[0].file).toBe('.plugin/plugin.json')
	})
})

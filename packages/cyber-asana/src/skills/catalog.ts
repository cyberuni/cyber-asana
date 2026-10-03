import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { repoRoot, skillsRoot } from './html-subset.js'

/**
 * The structural contract every shipped skill meets. Specified by
 * `.agents/spec/skills/skills.feature`; each rule name below is the `rule` a scenario names.
 */
export type CatalogRule =
	| 'front-block'
	| 'name-matches-directory'
	| 'description-present'
	| 'description-trigger-language'
	| 'description-budget'
	| 'reference-resolves'
	| 'npx-pinned'
	| 'docs-listing'
	| 'publish-allowlist'
	| 'manifest-skills-pointer'
	| 'setup-present'
	| 'setup-link-resolves'
	| 'setup-allowlist'

export type CatalogViolation = {
	rule: CatalogRule
	/** The offending skill's directory name, when the rule is per-skill. */
	skill?: string
	/** The offending file, relative to the skill directory or to the repo root. */
	file?: string
	/** The measured length, for the description budget. */
	length?: number
	message: string
}

export type CatalogSources = {
	/** Directory holding one subdirectory per skill. */
	skillsRoot: string
	/** Root the docs listings are resolved against. */
	repoRoot: string
	/** Package manifest whose `files` allowlist decides whether the catalog ships. */
	packageJsonPath: string
	/** Canonical plugin manifest whose `extensions["org.cyberuni.universal-plugin"].skills` field points a runtime at the catalog. */
	pluginManifestPath: string
	/** The plugin root's SETUP.md — what an agent reads to finish a plugin install. */
	setupPath: string
	/** Published tables that must name every shipped skill, repo-relative. */
	docsListings: string[]
}

/** Past this, agent runtimes truncate — and what gets cut is usually the trigger clause. */
const DESCRIPTION_BUDGET = 120

/** A description without one of these never says *when* the skill applies. */
const TRIGGER_LANGUAGE = /use this skill when|when to use/i

/**
 * `@latest` or a bare invocation silently upgrades under an agent mid-workflow. The install flag is
 * spelled both ways in the wild, so both are skipped over to reach the package name.
 */
const UNPINNED_INVOCATION = /npx\s+(?:--yes\s+|-y\s+)?cyber-asana(?!@)/

/** Where the plugin surface actually lives; a manifest pointing elsewhere finds nothing. */
const SHIPPED_SKILLS_POINTER = './skills/'

export function repoCatalogSources(): CatalogSources {
	return {
		skillsRoot,
		repoRoot,
		packageJsonPath: path.resolve(skillsRoot, '../package.json'),
		pluginManifestPath: path.resolve(skillsRoot, '../plugin.json'),
		setupPath: path.resolve(skillsRoot, '../SETUP.md'),
		docsListings: ['readme.md', 'apps/web/src/content/docs/skills/index.md'],
	}
}

async function skillNames(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true })
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

function parseFrontBlock(content: string): Record<string, string> | undefined {
	const block = /^---\n([\s\S]*?)\n---/.exec(content)
	if (!block) return undefined
	const fields: Record<string, string> = {}
	for (const line of block[1].split('\n')) {
		const match = /^([a-z-]+):\s*(.*)$/.exec(line)
		if (match) fields[match[1]] = match[2]
	}
	return fields
}

/** Every markdown file under the skill, references included — detail an agent runs is still detail. */
async function markdownFiles(dir: string, prefix = ''): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true })
	const files: string[] = []
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name
		if (entry.isDirectory()) files.push(...(await markdownFiles(path.join(dir, entry.name), relative)))
		else if (entry.name.endsWith('.md')) files.push(relative)
	}
	return files
}

async function exists(target: string): Promise<boolean> {
	try {
		await stat(target)
		return true
	} catch {
		return false
	}
}

async function readJson(file: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
}

async function checkFrontBlock(skill: string, content: string): Promise<CatalogViolation[]> {
	const fields = parseFrontBlock(content)
	if (!fields) {
		return [{ rule: 'front-block', skill, message: `${skill}: SKILL.md has no front block` }]
	}

	const violations: CatalogViolation[] = []
	if (fields.name !== skill) {
		violations.push({
			rule: 'name-matches-directory',
			skill,
			message: `${skill}: front block declares the name "${fields.name ?? ''}"`,
		})
	}
	if (!fields.description) {
		violations.push({ rule: 'description-present', skill, message: `${skill}: front block declares no description` })
		return violations
	}
	if (!TRIGGER_LANGUAGE.test(fields.description)) {
		violations.push({
			rule: 'description-trigger-language',
			skill,
			message: `${skill}: description never says when to use the skill`,
		})
	}
	if (fields.description.length > DESCRIPTION_BUDGET) {
		violations.push({
			rule: 'description-budget',
			skill,
			length: fields.description.length,
			message: `${skill}: description is ${fields.description.length} chars, over the ${DESCRIPTION_BUDGET} budget`,
		})
	}
	return violations
}

async function checkReferences(skill: string, dir: string, content: string): Promise<CatalogViolation[]> {
	const named = new Set([...content.matchAll(/`references\/([\w.-]+)`/g)].map((match) => match[1]))
	const violations: CatalogViolation[] = []
	for (const file of [...named].sort()) {
		if (await exists(path.join(dir, 'references', file))) continue
		violations.push({
			rule: 'reference-resolves',
			skill,
			file: `references/${file}`,
			message: `${skill}: references/${file} is named but not shipped`,
		})
	}
	return violations
}

async function checkPinning(skill: string, dir: string): Promise<CatalogViolation[]> {
	const violations: CatalogViolation[] = []
	for (const file of await markdownFiles(dir)) {
		const content = await readFile(path.join(dir, file), 'utf8')
		if (!UNPINNED_INVOCATION.test(content)) continue
		violations.push({
			rule: 'npx-pinned',
			skill,
			file,
			message: `${skill}/${file}: npx cyber-asana invocation is not pinned to a version`,
		})
	}
	return violations
}

async function checkDocsListings(names: string[], sources: CatalogSources): Promise<CatalogViolation[]> {
	const violations: CatalogViolation[] = []
	for (const listing of sources.docsListings) {
		const content = await readFile(path.join(sources.repoRoot, listing), 'utf8')
		for (const skill of names) {
			if (content.includes(skill)) continue
			violations.push({
				rule: 'docs-listing',
				skill,
				file: listing,
				message: `${listing}: no row for ${skill}`,
			})
		}
	}
	return violations
}

/** A link an agent is told to follow; anything with a scheme points outside the tarball. */
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g

/**
 * SETUP.md is the one instruction file outside `skills/`, so the per-skill checks never see it —
 * yet it is the first thing an agent reads after a plugin install, and it hands off by link.
 */
async function checkSetup(sources: CatalogSources): Promise<CatalogViolation[]> {
	if (!(await exists(sources.setupPath))) {
		return [
			{
				rule: 'setup-present',
				file: 'SETUP.md',
				message: 'SETUP.md: the plugin root ships no setup instructions',
			},
		]
	}

	const violations: CatalogViolation[] = []
	const content = await readFile(sources.setupPath, 'utf8')
	const root = path.dirname(sources.setupPath)

	if (UNPINNED_INVOCATION.test(content)) {
		violations.push({
			rule: 'npx-pinned',
			file: 'SETUP.md',
			message: 'SETUP.md: npx cyber-asana invocation is not pinned to a version',
		})
	}

	for (const [, target] of content.matchAll(MARKDOWN_LINK)) {
		if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue
		const [file] = target.split('#')
		if (await exists(path.resolve(root, file))) continue
		violations.push({
			rule: 'setup-link-resolves',
			file: target,
			message: `SETUP.md: ${target} is linked but not shipped`,
		})
	}

	return violations
}

async function checkPackaging(sources: CatalogSources): Promise<CatalogViolation[]> {
	const violations: CatalogViolation[] = []
	const shipped = path.basename(sources.skillsRoot)

	const files = (await readJson(sources.packageJsonPath)).files
	if (!Array.isArray(files) || !files.includes(shipped)) {
		violations.push({
			rule: 'publish-allowlist',
			file: 'package.json',
			message: `package.json: "${shipped}" is not on the files allowlist, so the catalog never ships`,
		})
	}

	const setup = path.basename(sources.setupPath)
	if (!Array.isArray(files) || !files.includes(setup)) {
		violations.push({
			rule: 'setup-allowlist',
			file: 'package.json',
			message: `package.json: "${setup}" is not on the files allowlist, so setup never reaches an installer`,
		})
	}

	const manifest = (await readJson(sources.pluginManifestPath)) as {
		extensions?: { 'org.cyberuni.universal-plugin'?: { skills?: unknown } }
	}
	const pointer = manifest.extensions?.['org.cyberuni.universal-plugin']?.skills
	if (pointer !== SHIPPED_SKILLS_POINTER) {
		violations.push({
			rule: 'manifest-skills-pointer',
			file: 'plugin.json',
			message: `plugin.json: skills points at ${JSON.stringify(pointer)}, not "${SHIPPED_SKILLS_POINTER}"`,
		})
	}

	return violations
}

/**
 * Every way the shipped catalog can be broken, in one list. Empty means the contract holds.
 */
export async function collectCatalogViolations(
	sources: CatalogSources = repoCatalogSources(),
): Promise<CatalogViolation[]> {
	const names = await skillNames(sources.skillsRoot)
	const violations: CatalogViolation[] = []

	for (const skill of names) {
		const dir = path.join(sources.skillsRoot, skill)
		const content = await readFile(path.join(dir, 'SKILL.md'), 'utf8')
		violations.push(...(await checkFrontBlock(skill, content)))
		violations.push(...(await checkReferences(skill, dir, content)))
		violations.push(...(await checkPinning(skill, dir)))
	}

	violations.push(...(await checkDocsListings(names, sources)))
	violations.push(...(await checkSetup(sources)))
	violations.push(...(await checkPackaging(sources)))

	return violations
}

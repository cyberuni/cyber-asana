import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { Document, isMap, parseDocument } from 'yaml'
import { CONVENTIONS_KEYS, CONVENTIONS_REFERENCE, parseConventions } from './conventions.js'
import { pathExists } from './repo-config.js'

export type MigrateConventionsOptions = {
	configPath: string
	/** The repo root, used when the config does not sit in a `.agents` folder. */
	root: string
	dryRun?: boolean
}

export type MigrateConventionsResult = {
	config: string
	reference: string
	/** The keys moved, in the order they are written. Empty when there was no block. */
	keys: string[]
	/** Whether the reference file is new rather than added to. */
	created: boolean
	written: boolean
}

const frontmatterPattern = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

/** The repo copy of the reference, beside a config kept in `.agents`, or under `root` otherwise. */
export function referencePath(configPath: string, root: string): string {
	const agents = basename(dirname(configPath)) === '.agents' ? dirname(configPath) : join(root, '.agents')
	return join(agents, 'references', `${CONVENTIONS_REFERENCE}.md`)
}

/** The block's keys, validated by the same rules the loader applies to the reference. */
function readBlock(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error('Repo config conventions must be an object')
	}
	for (const key of Object.keys(raw)) {
		if (!(CONVENTIONS_KEYS as readonly string[]).includes(key)) {
			throw new Error(`Unknown repo config key conventions.${key}; expected one of ${CONVENTIONS_KEYS.join(', ')}`)
		}
	}
	parseConventions(raw as Record<string, unknown>)
	return raw as Record<string, unknown>
}

/**
 * Add the keys to the reference's frontmatter, leaving its other keys, comments, and body as they
 * are. A key the reference already sets is a conflict for the user to settle, not to overwrite.
 */
function withKeys(text: string, block: Record<string, unknown>): string {
	const match = frontmatterPattern.exec(text)
	const doc = match ? parseDocument(match[1] as string) : new Document({})
	if (doc.contents === null) doc.contents = doc.createNode({})
	if (!isMap(doc.contents)) {
		throw new Error(`The frontmatter of ${CONVENTIONS_REFERENCE} is not a YAML mapping; fix it before migrating`)
	}
	const conflicts = Object.keys(block).filter((key) => doc.has(key))
	if (conflicts.length > 0) {
		throw new Error(
			`${CONVENTIONS_REFERENCE} already sets ${conflicts.join(', ')}. Settle the value by hand in the reference, then remove the key from the config's conventions block and run this again.`,
		)
	}
	for (const [key, value] of Object.entries(block)) doc.set(key, value)
	const body = match ? text.slice(match[0].length) : text
	return `---\n${doc.toString()}---\n${body}`
}

/**
 * Move a repo config's `conventions` block into the frontmatter of the repo copy of the
 * `cyber-asana.task-conventions` reference, then drop the block. The reference is written before
 * the config, so a failure never loses the settings.
 */
export async function migrateConventions({
	configPath,
	root,
	dryRun = false,
}: MigrateConventionsOptions): Promise<MigrateConventionsResult> {
	const raw = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>
	const reference = referencePath(configPath, root)
	if (raw.conventions === undefined) {
		return { config: configPath, reference, keys: [], created: false, written: false }
	}
	const block = readBlock(raw.conventions)
	const created = !(await pathExists(reference))
	const text = created
		? `---\n${new Document({ merge: 'merge-sections', ...block }).toString()}---\n`
		: withKeys(await readFile(reference, 'utf8'), block)
	const { conventions: _drop, ...rest } = raw
	if (!dryRun) {
		await mkdir(dirname(reference), { recursive: true })
		await writeFile(reference, text, 'utf8')
		await writeFile(configPath, `${JSON.stringify(rest, null, 2)}\n`, 'utf8')
	}
	return { config: configPath, reference, keys: Object.keys(block), created, written: !dryRun }
}

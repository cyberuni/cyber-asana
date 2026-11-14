import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { CodedConfigError } from '../../../platform/coded-error.js'
import { PAGE_MARKER } from './page.js'

/**
 * Writes the page to a local path and nothing else (D8). A path that already holds something other
 * than a page this command wrote is refused, so `--page` cannot clobber a user's file; its own
 * previous output is replaced, which makes a rerun idempotent.
 */
export async function writeDashboardPage(path: string, html: string): Promise<{ path: string; bytes: number }> {
	const existing = await stat(path).catch(() => undefined)
	if (existing) {
		const own = existing.isFile() && (await readFile(path, 'utf8')).includes(PAGE_MARKER)
		if (!own) {
			throw new CodedConfigError(
				'page-path-refused',
				`${path} exists and is not a dashboard page written by this command`,
				{ hint: 'Pass --page with a new path, or one holding a previous dashboard page' },
			)
		}
	}
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, html)
	return { path, bytes: Buffer.byteLength(html) }
}

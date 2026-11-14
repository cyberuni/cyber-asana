import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isCodedConfigError } from '../../../platform/coded-error.js'
import { PAGE_MARKER } from './page.js'
import { writeDashboardPage } from './page-file.js'

let dir: string
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'dash-page-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const html = `<!doctype html><html><head>${PAGE_MARKER}</head><body>x</body></html>`

describe('writeDashboardPage', () => {
	it('writes the file, creating missing folders, and reports the path and byte count', async () => {
		const path = join(dir, 'out', 'dash.html')
		const r = await writeDashboardPage(path, html)
		expect(await readFile(path, 'utf8')).toBe(html)
		expect(r).toEqual({ path, bytes: Buffer.byteLength(html) })
	})

	it('overwrites its own previous output, so a rerun is idempotent', async () => {
		const path = join(dir, 'dash.html')
		await writeDashboardPage(path, html)
		await writeDashboardPage(path, `${html}<!-- v2 -->`)
		expect(await readFile(path, 'utf8')).toContain('v2')
	})

	it('refuses a file that is not a dashboard page, and leaves it untouched', async () => {
		const path = join(dir, 'notes.txt')
		await writeFile(path, 'precious')
		const error = await writeDashboardPage(path, html).catch((e) => e)
		expect(isCodedConfigError(error) && error.code).toBe('page-path-refused')
		expect(await readFile(path, 'utf8')).toBe('precious')
	})

	it('refuses an HTML file that this command did not write', async () => {
		const path = join(dir, 'index.html')
		await writeFile(path, '<!doctype html><title>mine</title>')
		const error = await writeDashboardPage(path, html).catch((e) => e)
		expect(isCodedConfigError(error) && error.code).toBe('page-path-refused')
	})

	it('refuses a directory', async () => {
		const error = await writeDashboardPage(dir, html).catch((e) => e)
		expect(isCodedConfigError(error) && error.code).toBe('page-path-refused')
	})
})

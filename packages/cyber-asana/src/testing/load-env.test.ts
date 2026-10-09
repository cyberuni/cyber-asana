import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadEnvFiles } from './load-env.js'

describe('loadEnvFiles', () => {
	let dir: string
	const originalEnv = { ...process.env }

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'load-env-'))
	})

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true })
		process.env = { ...originalEnv }
	})

	it('loads variables from the first file that defines them', () => {
		const near = join(dir, 'near.env')
		const far = join(dir, 'far.env')
		writeFileSync(near, 'LOAD_ENV_A=near\n')
		writeFileSync(far, 'LOAD_ENV_A=far\nLOAD_ENV_B=far\n')

		loadEnvFiles([near, far])

		expect(process.env.LOAD_ENV_A).toBe('near')
		expect(process.env.LOAD_ENV_B).toBe('far')
	})

	it('never overrides a variable the shell already set', () => {
		const file = join(dir, '.env')
		writeFileSync(file, 'LOAD_ENV_C=from-file\n')
		process.env.LOAD_ENV_C = 'from-shell'

		loadEnvFiles([file])

		expect(process.env.LOAD_ENV_C).toBe('from-shell')
	})

	it('skips a file that does not exist', () => {
		expect(() => loadEnvFiles([join(dir, 'missing.env')])).not.toThrow()
	})
})

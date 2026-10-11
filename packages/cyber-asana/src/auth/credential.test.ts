import { describe, expect, it } from 'vitest'
import { maskToken, resolveCredential } from './credential.js'

describe('resolveCredential', () => {
	it('reports unauthenticated when no token is available', () => {
		const result = resolveCredential({ env: {} })
		expect(result.authenticated).toBe(false)
		expect(result.token).toBeUndefined()
		expect(result.source).toBeUndefined()
	})

	it('uses ASANA_ACCESS_TOKEN and names it as the source', () => {
		const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: 'access-token' } })
		expect(result.authenticated).toBe(true)
		expect(result.token).toBe('access-token')
		expect(result.source).toBe('ASANA_ACCESS_TOKEN')
	})

	it('ignores the removed ASANA_TOKEN alias', () => {
		const result = resolveCredential({ env: { ASANA_TOKEN: 'legacy-token' } })
		expect(result.authenticated).toBe(false)
		expect(result.shadowed).toEqual([])
	})

	it('prefers the --token flag over every environment variable', () => {
		const result = resolveCredential({
			tokenOverride: 'flag-token',
			env: { ASANA_ACCESS_TOKEN: 'access-token' },
		})
		expect(result.token).toBe('flag-token')
		expect(result.source).toBe('--token')
	})

	it('lists environment variables shadowed by the --token flag', () => {
		const result = resolveCredential({
			tokenOverride: 'flag-token',
			env: { ASANA_ACCESS_TOKEN: 'access-token' },
		})
		expect(result.shadowed).toEqual(['ASANA_ACCESS_TOKEN'])
	})

	it('reports nothing shadowed when only one source is present', () => {
		const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: 'access-token' } })
		expect(result.shadowed).toEqual([])
	})

	it('ignores environment variables set to an empty string', () => {
		const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: '' } })
		expect(result.authenticated).toBe(false)
		expect(result.shadowed).toEqual([])
	})

	it('ignores a --token flag set to an empty string', () => {
		const result = resolveCredential({ tokenOverride: '', env: { ASANA_ACCESS_TOKEN: 'access-token' } })
		expect(result.token).toBe('access-token')
		expect(result.source).toBe('ASANA_ACCESS_TOKEN')
	})

	it('falls back to stored OAuth credentials when nothing else is set', () => {
		const result = resolveCredential({
			env: {},
			stored: { accessToken: 'stored-token', expiresAt: 123, user: { gid: '1201', name: 'Homa Wong' } },
		})
		expect(result.authenticated).toBe(true)
		expect(result.token).toBe('stored-token')
		expect(result.source).toBe('credentials.json')
	})

	it('carries the stored expiry and account through for display', () => {
		const result = resolveCredential({
			env: {},
			stored: { accessToken: 'stored-token', expiresAt: 123, user: { gid: '1201', name: 'Homa Wong' } },
		})
		expect(result.expiresAt).toBe(123)
		expect(result.user?.name).toBe('Homa Wong')
	})

	it('lets an environment variable shadow stored credentials, and says so', () => {
		const result = resolveCredential({
			env: { ASANA_ACCESS_TOKEN: 'env-token' },
			stored: { accessToken: 'stored-token', expiresAt: 123 },
		})
		expect(result.source).toBe('ASANA_ACCESS_TOKEN')
		expect(result.shadowed).toEqual(['credentials.json'])
	})

	it('reports no expiry for a token that came from the environment', () => {
		const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: 'env-token' } })
		expect(result.expiresAt).toBeUndefined()
	})

	it('reads process.env when no environment is injected', () => {
		const result = resolveCredential({})
		expect(result).toHaveProperty('authenticated')
	})

	// A host that cannot expand a ${VAR} reference passes the reference text
	// through. Treating that as a token reports success and then fails with a 401.
	describe('when a host forwards an unexpanded reference', () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal placeholder text is the input under test
		const placeholder = '${ASANA_ACCESS_TOKEN}'

		it('does not accept the reference text as a credential', () => {
			const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: placeholder } })
			expect(result.authenticated).toBe(false)
			expect(result.token).toBeUndefined()
		})

		it('names the variable so the cause is visible rather than inferred', () => {
			const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: placeholder } })
			expect(result.unexpanded).toEqual(['ASANA_ACCESS_TOKEN'])
		})

		it('lets stored OAuth credentials win', () => {
			const result = resolveCredential({
				env: { ASANA_ACCESS_TOKEN: placeholder },
				stored: { accessToken: 'stored-token', expiresAt: 123 },
			})
			expect(result.source).toBe('credentials.json')
		})

		it('reports none when every value expanded', () => {
			const result = resolveCredential({ env: { ASANA_ACCESS_TOKEN: 'access-token' } })
			expect(result.unexpanded).toEqual([])
		})
	})
})

describe('maskToken', () => {
	it('reveals only the last four characters', () => {
		expect(maskToken('1/1201234567890:abcdef')).toBe('…cdef')
	})

	it('reveals nothing when the token is too short to mask', () => {
		expect(maskToken('abcd')).toBe('…')
	})
})

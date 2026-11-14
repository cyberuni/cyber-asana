import { describe, expect, it } from 'vitest'
import { DEFAULT_DASHBOARD_SETTINGS, loadDashboardSettings, parseDashboardSettings, statusFor } from './dashboard.js'

describe('parseDashboardSettings', () => {
	it('defaults to sprint, health, workload, velocity, the cli form, and the rules of the design', () => {
		expect(parseDashboardSettings({})).toEqual({
			reports: ['sprint', 'health', 'workload', 'velocity'],
			forms: ['cli'],
			status_parent: 'scope-default',
			status_rules: { off_track: 'error', at_risk: 'warning', otherwise: 'on_track' },
		})
	})

	it('reads an ordered list of reports, the forms, and the parent', () => {
		const s = parseDashboardSettings({
			reports: ['health', 'release-readiness'],
			forms: ['cli', 'page'],
			status_parent: 'portfolio',
		})
		expect(s.reports).toEqual(['health', 'release-readiness'])
		expect(s.forms).toEqual(['cli', 'page'])
		expect(s.status_parent).toBe('portfolio')
	})

	it.each([
		['reports', []],
		['reports', ['health', 'health']],
		['reports', 'health'],
		['reports', [3]],
		['forms', ['web']],
		['forms', []],
		['status_parent', 'team'],
		['status_rules', { off_track: 'info' }],
		['status_rules', { otherwise: 'green' }],
		['status_rules', { surprise: 'error' }],
	])('rejects a bad %s', (key, value) => {
		expect(() => parseDashboardSettings({ [key]: value })).toThrow(`cyber-asana.dashboard: ${key}`)
	})

	it('lets a team change one rule and keeps the others', () => {
		const s = parseDashboardSettings({ status_rules: { at_risk: 'error' } })
		expect(s.status_rules).toEqual({ off_track: 'error', at_risk: 'error', otherwise: 'on_track' })
	})
})

describe('statusFor', () => {
	const rules = DEFAULT_DASHBOARD_SETTINGS.status_rules
	it('is off_track on any error', () => expect(statusFor({ error: 1, warning: 4 }, rules)).toBe('off_track'))
	it('is at_risk on a warning and no error', () => expect(statusFor({ error: 0, warning: 1 }, rules)).toBe('at_risk'))
	it('is on_track with no finding', () => expect(statusFor({ error: 0, warning: 0 }, rules)).toBe('on_track'))
	it('follows a changed rule', () =>
		expect(statusFor({ error: 0, warning: 2 }, { ...rules, at_risk: 'error' })).toBe('on_track'))
})

describe('the shipped reference', () => {
	it('carries the defaults in its frontmatter', async () => {
		const s = await loadDashboardSettings()
		expect(s).toEqual(DEFAULT_DASHBOARD_SETTINGS)
	})
})

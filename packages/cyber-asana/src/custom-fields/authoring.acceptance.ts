import { expect, it } from 'vitest'
import { listItems } from '../platform/pagination.js'
import type { CustomFieldApi } from './api.js'

export type AuthoringAcceptanceDeps = {
	getApi: () => Pick<
		CustomFieldApi,
		| 'createCustomField'
		| 'getCustomField'
		| 'createEnumOption'
		| 'insertEnumOption'
		| 'updateEnumOption'
		| 'attachCustomField'
		| 'detachCustomField'
		| 'listCustomFieldSettingsForProject'
	>
	workspaceGid: string
	projectGid: string
	/** A custom field name no one else uses, so a rerun never clashes with a leftover. */
	uniqueName: () => string
	deleteField: (customFieldGid: string) => Promise<void>
}

type Option = { gid: string; name?: string; enabled?: boolean }

/**
 * The Asana call shapes behind `custom-field create`, `enum-option add | move | update`, and `attach |
 * detach`: the request bodies § 3 of the scrum design marks *(docs)*. It makes one enum field, drives
 * its options, attaches it to a project, and deletes the field at the end.
 */
export function defineCustomFieldAuthoringAcceptanceSpecs(deps: AuthoringAcceptanceDeps) {
	return () => {
		it('creates an enum field with options, manages them, and attaches the field idempotently', async () => {
			const api = deps.getApi()
			const field = await api.createCustomField({
				workspace: deps.workspaceGid,
				name: deps.uniqueName(),
				resourceSubtype: 'enum',
				enumOptions: [{ name: 'Sprint 1' }, { name: 'Sprint 2' }],
			})
			try {
				const options = async () =>
					(
						(await api.getCustomField(field.gid, { optFields: 'enum_options.name,enum_options.enabled' })) as {
							enum_options?: Option[]
						}
					).enum_options ?? []
				expect((await options()).map((o) => o.name)).toEqual(['Sprint 1', 'Sprint 2'])

				const third = await api.createEnumOption(field.gid, { name: 'Sprint 3' })
				expect((await options()).map((o) => o.name)).toEqual(['Sprint 1', 'Sprint 2', 'Sprint 3'])

				const first = (await options())[0] as Option
				await api.createEnumOption(field.gid, { name: 'Sprint 0', insertBefore: first.gid })
				expect((await options())[0]?.name).toBe('Sprint 0')

				await api.insertEnumOption(field.gid, { enumOption: third.gid, beforeEnumOption: first.gid })
				expect((await options()).map((o) => o.name)).toEqual(['Sprint 0', 'Sprint 3', 'Sprint 1', 'Sprint 2'])

				await api.updateEnumOption(third.gid, { enabled: false })
				expect((await options()).find((o) => o.gid === third.gid)?.enabled).toBe(false)

				expect((await api.attachCustomField(deps.projectGid, field.gid)).status).toBe('attached')
				expect((await api.attachCustomField(deps.projectGid, field.gid)).status).toBe('already_attached')
				const attached = listItems(
					(await api.listCustomFieldSettingsForProject(deps.projectGid, {
						fetchAll: true,
						optFields: 'custom_field.gid',
					})) as never,
				) as Array<{ custom_field?: { gid?: string } }>
				expect(attached.some((s) => s.custom_field?.gid === field.gid)).toBe(true)

				expect((await api.detachCustomField(deps.projectGid, field.gid)).status).toBe('detached')
				expect((await api.detachCustomField(deps.projectGid, field.gid)).status).toBe('already_detached')
			} finally {
				await deps.deleteField(field.gid)
			}
		})
	}
}

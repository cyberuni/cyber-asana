import type { PaginationOptions } from '../platform/pagination.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	AddCustomFieldToProjectOptions,
	CreateCustomFieldInput,
	CreateEnumOptionInput,
	CustomFieldGateway,
	InsertEnumOptionInput,
	UpdateEnumOptionInput,
} from './gateway.js'

export type {
	AddCustomFieldToProjectOptions,
	CreateCustomFieldInput,
	CreateEnumOptionInput,
	InsertEnumOptionInput,
	UpdateEnumOptionInput,
}

export type CustomFieldApi = ReturnType<typeof createCustomFieldApi>

export function createCustomFieldApi(gateway: CustomFieldGateway) {
	async function isAttached(projectGid: string, customFieldGid: string) {
		const settings = (await gateway.listCustomFieldSettingsForProject(projectGid, {
			fetchAll: true,
			optFields: 'custom_field.gid',
		})) as never
		return (listItems(settings) as Array<{ custom_field?: { gid?: string } | null }>).some(
			(s) => s.custom_field?.gid === customFieldGid,
		)
	}

	return {
		listCustomFields(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFields(workspaceGid, opts)
		},
		getCustomField(customFieldGid: string, opts?: ReadOptions) {
			return gateway.getCustomField(customFieldGid, opts)
		},
		listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForProject(projectGid, opts)
		},
		listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForPortfolio(portfolioGid, opts)
		},
		listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForGoal(goalGid, opts)
		},
		listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForTeam(teamGid, opts)
		},
		createCustomField(input: CreateCustomFieldInput) {
			return gateway.createCustomField(input)
		},
		createEnumOption(customFieldGid: string, input: CreateEnumOptionInput) {
			return gateway.createEnumOption(customFieldGid, input)
		},
		insertEnumOption(customFieldGid: string, input: InsertEnumOptionInput) {
			return gateway.insertEnumOption(customFieldGid, input)
		},
		updateEnumOption(enumOptionGid: string, input: UpdateEnumOptionInput) {
			return gateway.updateEnumOption(enumOptionGid, input)
		},
		/** Attaching a field the project already has succeeds with `already_attached` and writes nothing. */
		async attachCustomField(projectGid: string, customFieldGid: string, opts?: AddCustomFieldToProjectOptions) {
			if (await isAttached(projectGid, customFieldGid)) {
				return { project: projectGid, custom_field: customFieldGid, status: 'already_attached' as const }
			}
			await gateway.addCustomFieldToProject(projectGid, customFieldGid, opts)
			return { project: projectGid, custom_field: customFieldGid, status: 'attached' as const }
		},
		/** Detaching a field the project does not have succeeds with `already_detached` and writes nothing. */
		async detachCustomField(projectGid: string, customFieldGid: string) {
			if (!(await isAttached(projectGid, customFieldGid))) {
				return { project: projectGid, custom_field: customFieldGid, status: 'already_detached' as const }
			}
			await gateway.removeCustomFieldFromProject(projectGid, customFieldGid)
			return { project: projectGid, custom_field: customFieldGid, status: 'detached' as const }
		},
	}
}

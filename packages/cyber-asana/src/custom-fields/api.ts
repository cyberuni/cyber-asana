import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { CustomFieldGateway } from './gateway.js'

export type CustomFieldApi = ReturnType<typeof createCustomFieldApi>

export function createCustomFieldApi(gateway: CustomFieldGateway) {
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
	}
}

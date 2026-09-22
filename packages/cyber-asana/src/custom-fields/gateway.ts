import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type CustomFieldGateway = {
	listCustomFields(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getCustomField(customFieldGid: string, opts?: ReadOptions): Promise<any>
	listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
}

export function createAsanaCustomFieldGateway(client: Asana.ApiClient): CustomFieldGateway {
	const customFieldsApi = new Asana.CustomFieldsApi(client)
	const settingsApi = new Asana.CustomFieldSettingsApi(client)

	return {
		async listCustomFields(workspaceGid, opts) {
			const res = await customFieldsApi.getCustomFieldsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getCustomField(customFieldGid, opts) {
			const res = await customFieldsApi.getCustomField(customFieldGid, toAsanaReadOptions(opts))
			return res.data
		},
		async listCustomFieldSettingsForProject(projectGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForProject(projectGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForPortfolio(portfolioGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForPortfolio(portfolioGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForGoal(goalGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForGoal(goalGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForTeam(teamGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForTeam(teamGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
	}
}

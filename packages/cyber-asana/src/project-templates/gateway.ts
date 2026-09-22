import Asana from 'asana'
import type { Job } from '../job-polling.js'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

/** A date variable the template asks the caller to fill in at instantiation time. */
export type RequestedDate = {
	gid: string
	value: string
}

/** A template role, paired with the user who should hold it in the new project. */
export type RequestedRole = {
	gid: string
	/** A user GID, an email, or "me". */
	value: string
}

/** Asana's non-deprecated replacement for the `public` boolean. */
export type ProjectTemplatePrivacySetting = 'public_to_workspace' | 'private_to_team' | 'private'

export type InstantiateProjectFields = {
	name?: string
	/** Team the new project belongs to. Required when the workspace is an organization. */
	team?: string
	/** *Deprecated by Asana* in favour of `privacySetting`. */
	public?: boolean
	privacySetting?: ProjectTemplatePrivacySetting
	/**
	 * Fail the instantiation when a date variable is left unfilled, instead of
	 * letting Asana substitute a default date for it.
	 */
	isStrict?: boolean
	requestedDates?: RequestedDate[]
	requestedRoles?: RequestedRole[]
}

/** Which templates to list: a workspace's, a team's, or (with both) a team's within a workspace. */
export type ProjectTemplateFilters = {
	workspace?: string
	team?: string
}

export type ProjectTemplateGateway = {
	listProjectTemplates(filters?: ProjectTemplateFilters, opts?: PaginationOptions): Promise<ListResult<any>>
	listProjectTemplatesForTeam(teamGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getProjectTemplate(templateGid: string, opts?: ReadOptions): Promise<any>
	instantiateProject(templateGid: string, fields: InstantiateProjectFields): Promise<Job>
}

function instantiationBody(fields: InstantiateProjectFields) {
	return {
		data: {
			...(fields.name !== undefined && { name: fields.name }),
			...(fields.team !== undefined && { team: fields.team }),
			...(fields.public !== undefined && { public: fields.public }),
			...(fields.privacySetting !== undefined && { privacy_setting: fields.privacySetting }),
			...(fields.isStrict !== undefined && { is_strict: fields.isStrict }),
			...(fields.requestedDates !== undefined && { requested_dates: fields.requestedDates }),
			...(fields.requestedRoles !== undefined && { requested_roles: fields.requestedRoles }),
		},
	}
}

export function createAsanaProjectTemplateGateway(client: Asana.ApiClient): ProjectTemplateGateway {
	const templatesApi = new Asana.ProjectTemplatesApi(client)

	return {
		async listProjectTemplates(filters, opts) {
			const res = await templatesApi.getProjectTemplates({
				...(filters?.workspace !== undefined && { workspace: filters.workspace }),
				...(filters?.team !== undefined && { team: filters.team }),
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async listProjectTemplatesForTeam(teamGid, opts) {
			const res = await templatesApi.getProjectTemplatesForTeam(teamGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getProjectTemplate(templateGid, opts) {
			const res = await templatesApi.getProjectTemplate(templateGid, toAsanaReadOptions(opts))
			return res.data
		},
		async instantiateProject(templateGid, fields) {
			const res = await templatesApi.instantiateProject(templateGid, { body: instantiationBody(fields) })
			return res.data
		},
	}
}

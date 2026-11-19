/** The icons Asana accepts for a project's `icon`. */
export const PROJECT_ICONS = [
	'list',
	'board',
	'timeline',
	'calendar',
	'rocket',
	'people',
	'graph',
	'star',
	'bug',
	'light_bulb',
	'globe',
	'gear',
	'notebook',
	'computer',
	'check',
	'target',
	'html',
	'megaphone',
	'chat_bubbles',
	'briefcase',
	'page_layout',
	'mountain_flag',
	'puzzle',
	'presentation',
	'line_and_symbols',
	'speed_dial',
	'ribbon',
	'shoe',
	'shopping_basket',
	'map',
	'ticket',
	'coins',
] as const
export type ProjectIcon = (typeof PROJECT_ICONS)[number]

/** The values Asana accepts for a project's `resource_subtype`. */
export const PROJECT_RESOURCE_SUBTYPES = ['default_project', 'custom'] as const
export type ProjectResourceSubtype = (typeof PROJECT_RESOURCE_SUBTYPES)[number]

/** The values Asana accepts for `minimum_access_level_for_customization` and `..._for_sharing`. */
export const PROJECT_MINIMUM_ACCESS_LEVELS = ['admin', 'editor'] as const
export type ProjectMinimumAccessLevel = (typeof PROJECT_MINIMUM_ACCESS_LEVELS)[number]

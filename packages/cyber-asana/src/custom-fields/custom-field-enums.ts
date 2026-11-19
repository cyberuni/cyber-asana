/** The values Asana accepts for a custom field's `format`. */
export const CUSTOM_FIELD_FORMATS = ['currency', 'identifier', 'percentage', 'custom', 'duration', 'none'] as const
export type CustomFieldFormat = (typeof CUSTOM_FIELD_FORMATS)[number]

/** The values Asana accepts for a custom field's `custom_label_position`. */
export const CUSTOM_LABEL_POSITIONS = ['prefix', 'suffix'] as const
export type CustomLabelPosition = (typeof CUSTOM_LABEL_POSITIONS)[number]

/** The kinds of object a custom field's `input_restrictions` can limit its values to. */
export const CUSTOM_FIELD_INPUT_RESTRICTIONS = ['task', 'project', 'portfolio', 'goal', 'team', 'record'] as const
export type CustomFieldInputRestriction = (typeof CUSTOM_FIELD_INPUT_RESTRICTIONS)[number]

import { createAutocomplete } from './shared';
import { hasDarkBackground } from '../utils/theme';

const PLAIN_TEXT_FIELDS = [
    'bugnote_text',
    'description',
    'steps_to_reproduce',
    'additional_info',
    'summary',
    'additional_information',
];

export function createAutocompleteWithoutEditor(excludedIds = []) {
    const excluded = new Set(excludedIds);
    const elements = PLAIN_TEXT_FIELDS
        .filter(id => !excluded.has(id))
        .map(id => document.getElementById(id))
        .filter(Boolean);

    return createAutocomplete(elements, hasDarkBackground);
}

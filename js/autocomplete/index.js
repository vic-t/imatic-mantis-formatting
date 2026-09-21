import { createAutocomplete } from './shared';

export function createEditorAutocomplete(editor, darkMode = false) {
    return createAutocomplete([
        editor.vditor.sv.element,
        editor.vditor.ir.element,
        editor.vditor.wysiwyg.element,
    ], () => darkMode);
}

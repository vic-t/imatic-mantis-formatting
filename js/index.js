import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { createEditorAutocomplete } from './autocomplete';
import { createAutocompleteWithoutEditor } from './autocomplete/autocompleteWithoutEditor';
import { getSettings } from './utils/mentionDom';
import { hasDarkBackground } from './utils/theme';

function trimContentEditableDoubleClickSelection(editorContent) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (!editorContent.contains(range.commonAncestorContainer)) return;

    const trailingWhitespace = range.toString().match(/[ \t\u00a0]+$/);
    if (!trailingWhitespace) return;

    let remaining = trailingWhitespace[0].length;
    const textNodes = [];
    const walker = document.createTreeWalker(editorContent, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
        if (range.intersectsNode(node)) textNodes.push(node);
    }

    for (let index = textNodes.length - 1; index >= 0 && remaining > 0; index--) {
        const textNode = textNodes[index];
        const startOffset = textNode === range.startContainer ? range.startOffset : 0;
        const endOffset = textNode === range.endContainer ? range.endOffset : textNode.data.length;
        const selectedLength = endOffset - startOffset;

        if (remaining <= selectedLength) {
            range.setEnd(textNode, endOffset - remaining);
            remaining = 0;
        } else {
            remaining -= selectedLength;
        }
    }
}

function bindDoubleClickSelection(editor) {
    const source = editor.vditor.sv.element;
    source.addEventListener('dblclick', () => {
        window.requestAnimationFrame(() => {
            const selected = source.value.slice(source.selectionStart, source.selectionEnd);
            const trailingWhitespace = selected.match(/[ \t]+$/);
            if (trailingWhitespace) {
                source.selectionEnd -= trailingWhitespace[0].length;
            }
        });
    });

    [editor.vditor.ir.element, editor.vditor.wysiwyg.element].forEach(editorContent => {
        editorContent.addEventListener('dblclick', () => {
            window.requestAnimationFrame(() => trimContentEditableDoubleClickSelection(editorContent));
        });
    });
}

function applyEditorBackground(editor, editorContainer, backgroundColor) {
    editorContainer.style.backgroundColor = backgroundColor;
    [
        editor.vditor.sv.element,
        editor.vditor.ir.element,
        editor.vditor.wysiwyg.element,
        editor.vditor.preview.element,
    ].forEach(element => {
        element.style.backgroundColor = backgroundColor;
    });
}

function initEditor(textArea, settings, darkMode) {
    const options = settings.options || {};
    const computedStyle = window.getComputedStyle(textArea);
    const baseHeight = parseFloat(computedStyle.height) || 300;
    const editorContainer = document.createElement('div');
    editorContainer.className = 'imatic-vditor';
    textArea.parentNode.insertBefore(editorContainer, textArea.nextSibling);

    let editor;
    editor = new Vditor(editorContainer, {
        cache: { enable: false },
        cdn: settings.assets.base,
        icon: 'ant',
        lang: 'en_US',
        value: textArea.value || '',
        mode: ['sv', 'wysiwyg', 'ir'].includes(options.mode) ? options.mode : 'sv',
        height: options.height || baseHeight + 70,
        theme: darkMode ? 'dark' : 'classic',
        toolbar: options.toolbar,
        toolbarConfig: { pin: false },
        resize: { enable: true, position: 'bottom' },
        hint: {
            emoji: {},
            emojiPath: '',
            extend: [],
        },
        preview: {
            actions: [],
            mode: options.previewMode === 'both' ? 'both' : 'editor',
            hljs: { enable: false },
            markdown: {
                codeBlockPreview: false,
                mathBlockPreview: false,
                sanitize: options.sanitize !== false,
            },
            render: { media: { enable: false } },
            theme: {
                current: darkMode ? 'dark' : 'light',
                path: `${settings.assets.base}/dist/css/content-theme`,
            },
        },
        image: { isPreview: false },
        input(markdown) {
            textArea.value = markdown;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.dispatchEvent(new Event('change', { bubbles: true }));
        },
        after() {
            applyEditorBackground(editor, editorContainer, computedStyle.backgroundColor);
            bindDoubleClickSelection(editor);
            createEditorAutocomplete(editor, darkMode);
            textArea.style.display = 'none';
        },
    });

    const viewStatusElements = [
        document.getElementById('bugnote_add_view_status'),
        document.getElementById('private'),
    ].filter(Boolean);

    viewStatusElements.forEach(viewStatus => {
        viewStatus.addEventListener('change', () => {
            if (!editor.vditor) return;
            applyEditorBackground(
                editor,
                editorContainer,
                window.getComputedStyle(textArea).backgroundColor,
            );
        });
    });

    return editor;
}

document.addEventListener('DOMContentLoaded', () => {
    const settings = getSettings();
    const configuredIds = Array.isArray(settings.textAreas) ? settings.textAreas : [];
    const darkMode = hasDarkBackground(document.body);

    if (!settings.enabled || !settings.enabledForUser) {
        createAutocompleteWithoutEditor();
        return;
    }

    configuredIds.forEach(id => {
        const textArea = document.getElementById(id);
        if (textArea) initEditor(textArea, settings, darkMode);
    });

    createAutocompleteWithoutEditor(configuredIds);
});

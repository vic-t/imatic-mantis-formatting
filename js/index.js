import { getSettings } from "./utils/mentionDom";
import { hasDarkBackground } from "./utils/theme";
import { createAutocomplete } from "./autocomplete";
import { createAutocompleteWithoutToastUI } from "./autocomplete/autocompleteWithoutToastUI";
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import Editor from '@toast-ui/editor';

function trimMarkdownDoubleClickSelection(editorContent) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (!editorContent.contains(range.commonAncestorContainer)) return;

    const selectedText = range.toString();
    const trailingWhitespace = selectedText.match(/[ \t\u00a0]+$/);
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

function initEditor(textArea, settings, onReady) {

    const editorBarOffset = 70;

    const editorContainer = document.createElement('div');
    editorContainer.id = 'editor';
    textArea.parentNode.insertBefore(editorContainer, textArea.nextSibling);

    const computedStyle = window.getComputedStyle(textArea);
    const baseHeight = parseFloat(computedStyle.height);
    const darkMode = hasDarkBackground(textArea);

    const heightValue = settings.options.height ? settings.options.height : baseHeight + editorBarOffset;

    const savedText = textArea.value || '';

    const editor = new Editor({
        el: editorContainer,
        theme: darkMode ? 'dark' : 'light',
        initialEditType: settings.options.initialEditType || 'markdown',
        initialValue: savedText,
        previewStyle: settings.options.previewStyle || 'tab',
        customHTMLSanitizer: settings.options.useDefaultHTMLSanitizer === false
            ? html => DOMPurify.sanitize(html, settings.options.useDefaultHTMLSanitizerOptions)
            : undefined,
        useCommandShortcut: settings.options.useCommandShortcut || false,
        useDefaultHTMLSanitizerOptions: settings.options.useDefaultHTMLSanitizerOptions || {},
        toolbarItems: settings.options.toolbarItems || [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote', 'ul', 'ol', 'task'],
            ['table', 'link'],
            ['code', 'codeblock'],
            ['scrollSync']
        ],
        autofocus: false,
        hooks: {
            addImageBlobHook: function (blob, callback) {
                return false;
            }
        }
    });
    editor.on('change', () => {
        textArea.value = editor.getMarkdown();

        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        textArea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const markdownEditor = editorContainer.querySelector('.toastui-editor-md-container .ProseMirror');
    if (markdownEditor) {
        markdownEditor.addEventListener('dblclick', () => {
            window.requestAnimationFrame(() => trimMarkdownDoubleClickSelection(markdownEditor));
        });
    }

    createAutocomplete(editor, darkMode)

    if (typeof onReady === 'function') {
        onReady(editor, editorContainer, computedStyle);
    }

    return editor;
}

document.addEventListener('DOMContentLoaded', () => {

    const settings = getSettings();

    if (!settings.enabled) return;


    if (!settings.enabledForUser) {
        createAutocompleteWithoutToastUI();
        return;
    }

    settings.textAreas.forEach(id => {

        const textarea = document.getElementById(id);

        if (!textarea) return;

        initEditor(textarea, settings, (editorInstance, editorContainer, computedStyle) => {

            let editorForChangeBgColor = editorContainer;

            if (settings.options.initialEditType === 'wysiwyg') {
                const wwMode = editorContainer.querySelector('.toastui-editor.ww-mode');
                if (wwMode) {
                    editorForChangeBgColor = wwMode;
                    wwMode.style.backgroundColor = computedStyle.backgroundColor;
                }
            } else if (settings.options.initialEditType === 'markdown') {
                const mdMode = editorContainer.querySelector('.toastui-editor.md-mode');
                if (mdMode) {
                    editorForChangeBgColor = mdMode;
                    mdMode.style.backgroundColor = computedStyle.backgroundColor;
                }
            }
            textarea.style.display = 'none';

            const viewStatusElements = [
                document.getElementById('bugnote_add_view_status'),
                document.getElementById('private')
            ].filter(Boolean);

            viewStatusElements.forEach(viewStatus => {
                viewStatus.addEventListener('change', () => {
                    const computedStyle = window.getComputedStyle(textarea);
                    editorForChangeBgColor.style.backgroundColor = computedStyle.backgroundColor;
                });
            });
        });
    });
});




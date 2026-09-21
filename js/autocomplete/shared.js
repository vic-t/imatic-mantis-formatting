import Tribute from 'tributejs';
import { getUsersForMention } from '../utils/mentionDom';

let nextContainerId = 0;

export function createAutocomplete(elements, isDark = () => false) {
    const users = getUsersForMention();
    if (!users.length) return [];

    return elements.filter(Boolean).map(element => {
        if (element.__imaticTribute) return element.__imaticTribute;

        const containerId = nextContainerId++;
        const containerClass = `imatic-tribute imatic-tribute-${containerId}${isDark(element) ? ' imatic-formatting-dark' : ''}`;
        const tribute = new Tribute({
            values(text, callback) {
                callback(users
                    .filter(user => user.key.toLowerCase().startsWith(text.toLowerCase()))
                    .map(user => ({ key: user.key, value: user.key, label: user.value })));
            },
            trigger: '@',
            selectClass: 'tribute-highlight',
            containerClass,
            itemClass: 'tribute-item',
            lookup: 'key',
            fillAttr: 'value',
            selectTemplate(item) {
                return `@${item.original.value}`;
            },
            menuItemTemplate(item) {
                return item.original.label;
            },
            menuShowMinLength: 1,
            allowSpaces: false,
            replaceTextSuffix: ' ',
            positionMenu: true,
            spaceSelectsMatch: false,
            noMatchTemplate() {
                return '';
            },
        });

        tribute.attach(element);
        element.__imaticTribute = tribute;

        element.addEventListener('keydown', event => {
            if (tribute.isActive && (event.key === 'Tab' || event.key === 'Enter')) {
                event.preventDefault();
                event.stopPropagation();
                tribute.selectItemAtIndex(tribute.menuSelected);
                tribute.hideMenu();
            }
        }, { capture: true });

        element.addEventListener('tribute-active-true', () => {
            window.requestAnimationFrame(() => {
                const container = document.querySelector(`.imatic-tribute-${containerId}`);
                if (container) {
                    const editorRoot = element.closest('.imatic-vditor') || element;
                    container.style.width = `${editorRoot.getBoundingClientRect().width}px`;
                }
            });
        });

        element.addEventListener('blur', () => tribute.hideMenu());
        return tribute;
    });
}

export function getSettings() {
    const el = document.querySelector('#imaticFormatting')
    const data = el.dataset.data;
    if (!data) {
        throw new Error('Missing data attribute on #imaticFormatting element');
    }
    return JSON.parse(data);
}
export function getUsersForMention() {
    return getSettings().mentionUsers || [];
}


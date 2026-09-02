export function hasDarkBackground(element) {
    let current = element;

    while (current) {
        const color = window.getComputedStyle(current).backgroundColor;
        const channels = color.match(/[\d.]+/g);

        if (channels && channels.length >= 3) {
            const alpha = channels.length >= 4 ? Number(channels[3]) : 1;
            if (alpha > 0) {
                const [red, green, blue] = channels.slice(0, 3).map(channel => {
                    const value = Number(channel) / 255;
                    return value <= 0.04045
                        ? value / 12.92
                        : Math.pow((value + 0.055) / 1.055, 2.4);
                });

                return (0.2126 * red + 0.7152 * green + 0.0722 * blue) < 0.5;
            }
        }

        current = current.parentElement;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

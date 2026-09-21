const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    return  {
        mode: argv.mode || 'development',
        entry: path.resolve(__dirname, 'js', 'index.js'),
        devtool: argv.mode === 'production' ? false : 'source-map',
        output: {
            path: path.resolve(__dirname, 'files'),
            filename: 'main.js',
            clean: false,
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                    },
                },
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'js', 'lute', 'lute.min.js'),
                        to: path.join('vditor', 'dist', 'js', 'lute', 'lute.min.js'),
                    },
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'js', 'i18n', 'en_US.js'),
                        to: path.join('vditor', 'dist', 'js', 'i18n', 'en_US.js'),
                    },
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'js', 'icons', 'ant.js'),
                        to: path.join('vditor', 'dist', 'js', 'icons', 'ant.js'),
                    },
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'css', 'content-theme', 'light.css'),
                        to: path.join('vditor', 'dist', 'css', 'content-theme', 'light.css'),
                    },
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'css', 'content-theme', 'dark.css'),
                        to: path.join('vditor', 'dist', 'css', 'content-theme', 'dark.css'),
                    },
                    {
                        from: path.resolve(__dirname, 'node_modules', 'vditor', 'dist', 'images', 'emoji'),
                        to: path.join('vditor', 'dist', 'images', 'emoji'),
                    },
                ],
            }),
        ],
    }
}

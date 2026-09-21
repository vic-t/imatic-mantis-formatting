const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const version = packageJson.version;
const dist = path.join(root, 'dist');
const staging = path.join(dist, 'ImaticFormatting');
const archivePath = path.join(dist, `ImaticFormatting-${version}.zip`);
const checksumPath = `${archivePath}.sha256`;

const requiredFiles = [
    'ImaticFormatting.php',
    'README.md',
    'composer.json',
    'composer.lock',
];
const requiredDirectories = ['files', 'inc', 'lang', 'pages'];

function copyDirectory(source, destination) {
    fs.cpSync(source, destination, {
        recursive: true,
        filter(file) {
            const relative = path.relative(root, file).replace(/\\/g, '/');
            return !file.endsWith('.map')
                && relative !== 'files/toast'
                && !relative.startsWith('files/toast/');
        },
    });
}

function run(command, args, cwd, shell = process.platform === 'win32') {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        shell,
        stdio: 'inherit',
    });

    if (result.error || result.status !== 0) {
        throw result.error || new Error(`${command} exited with status ${result.status}`);
    }
}

async function createArchive() {
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(staging, 'ImaticFormatting');
        archive.finalize();
    });
}

async function main() {
    const pluginSource = fs.readFileSync(path.join(root, 'ImaticFormatting.php'), 'utf8');
    const pluginVersion = pluginSource.match(/\$this->version\s*=\s*'([^']+)'/);
    if (!pluginVersion || pluginVersion[1] !== version) {
        throw new Error(`package.json version ${version} does not match the plugin version`);
    }

    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });

    requiredFiles.forEach(file => {
        const source = path.join(root, file);
        if (!fs.existsSync(source)) throw new Error(`Missing release file: ${file}`);
        fs.copyFileSync(source, path.join(staging, file));
    });

    requiredDirectories.forEach(directory => {
        const source = path.join(root, directory);
        if (!fs.existsSync(source)) throw new Error(`Missing release directory: ${directory}`);
        copyDirectory(source, path.join(staging, directory));
    });

    const composerArgs = [
        'install',
        '--no-dev',
        '--prefer-dist',
        '--optimize-autoloader',
        '--no-interaction',
        '--no-progress',
    ];
    if (process.env.COMPOSER_PHAR) {
        run(process.env.PHP_BIN || 'php', [process.env.COMPOSER_PHAR, ...composerArgs], staging, false);
    } else {
        run(process.env.COMPOSER || 'composer', composerArgs, staging);
    }

    const requiredRuntimeFiles = [
        'vendor/autoload.php',
        'files/main.js',
        'files/editor.css',
        'files/vditor/dist/js/lute/lute.min.js',
        'files/vditor/dist/js/i18n/en_US.js',
        'files/vditor/dist/js/icons/ant.js',
        'files/vditor/dist/css/content-theme/light.css',
        'files/vditor/dist/css/content-theme/dark.css',
        'files/vditor/dist/images/emoji/vditor.png',
    ];
    requiredRuntimeFiles.forEach(file => {
        if (!fs.existsSync(path.join(staging, file))) {
            throw new Error(`Missing packaged runtime file: ${file}`);
        }
    });

    await createArchive();
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
    fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(archivePath)}\n`);
    fs.rmSync(staging, { recursive: true, force: true });

    console.log(`Created ${archivePath}`);
    console.log(`Created ${checksumPath}`);
}

main().catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
});

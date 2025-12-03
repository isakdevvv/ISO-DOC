#!/usr/bin/env node
/**
 * Boots the local development database (Postgres via Docker),
 * runs Prisma migrations + seed, and then starts the backend/frontend
 * dev servers concurrently – mirroring the old `npm run dev`.
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const killPortsScript = path.join(__dirname, 'kill-dev-ports.js');
const isWindows = process.platform === 'win32';
const prismaBin = path.join(
    backendDir,
    'node_modules',
    '.bin',
    isWindows ? 'prisma.cmd' : 'prisma',
);
const concurrentlyBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    isWindows ? 'concurrently.cmd' : 'concurrently',
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runSync(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        ...options,
    });

    if (result.status !== 0) {
        throw new Error(
            `Command "${command} ${args.join(' ')}" failed with code ${result.status ?? 'unknown'}`,
        );
    }
}

function detectComposeCommand() {
    const candidates = [
        { command: 'docker', args: ['compose'] },
        { command: 'docker-compose', args: [] },
    ];

    for (const candidate of candidates) {
        const res = spawnSync(candidate.command, [...candidate.args, 'version'], {
            stdio: 'ignore',
        });
        if (res.status === 0) {
            return candidate;
        }
    }

    return null;
}

async function runPrismaCommand(args, label) {
    const maxAttempts = 5;

    // Add backend/node_modules/.bin to PATH so that `ts-node` (used in seed) is found
    const env = { ...process.env };
    const pathKey = isWindows ? 'Path' : 'PATH';
    const backendBin = path.join(backendDir, 'node_modules', '.bin');
    env[pathKey] = `${backendBin}${path.delimiter}${env[pathKey] || ''}`;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const result = spawnSync(prismaBin, args, {
            cwd: backendDir,
            stdio: 'inherit',
            env,
        });
        if (result.status === 0) {
            return;
        }

        if (attempt === maxAttempts) {
            throw new Error(`Failed to ${label} after ${maxAttempts} attempts.`);
        }

        console.warn(
            `[dev] Prisma command "${args.join(' ')}" failed (attempt ${attempt}/${maxAttempts}). ` +
            'Retrying in 3s...',
        );
        await sleep(3000);
    }
}

async function bootstrapDatabase() {
    const compose = detectComposeCommand();
    if (!compose) {
        throw new Error(
            'Docker Compose was not found in PATH. Install Docker Desktop or set ' +
            'SKIP_DEV_DB_BOOTSTRAP=1 to run against an already running Postgres instance.',
        );
    }

    console.log('[dev] Starting local Postgres via Docker Compose...');
    runSync(compose.command, [...compose.args, 'up', '-d', 'postgres'], { cwd: rootDir });

    console.log('[dev] Applying database migrations...');
    await runPrismaCommand(['migrate', 'deploy'], 'apply migrations');

    console.log('[dev] Seeding demo data (idempotent)...');
    await runPrismaCommand(['db', 'seed'], 'seed demo data');
}

function startDevProcesses() {
    const child = spawn(
        concurrentlyBin,
        [
            '--kill-others-on-fail',
            '--names',
            'backend,frontend',
            'npm run dev:backend',
            'npm run dev:frontend',
        ],
        {
            cwd: rootDir,
            stdio: 'inherit',
        },
    );

    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));

    child.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
    runSync(process.execPath, [killPortsScript], { cwd: rootDir });

    const skipDbBootstrap =
        (process.env.SKIP_DEV_DB_BOOTSTRAP || '').toLowerCase() === '1' ||
        (process.env.SKIP_DEV_DB_BOOTSTRAP || '').toLowerCase() === 'true';

    if (skipDbBootstrap) {
        console.log('[dev] SKIP_DEV_DB_BOOTSTRAP is set. Assuming Postgres is already running.');
    } else {
        await bootstrapDatabase();
    }

    startDevProcesses();
}

main().catch((err) => {
    console.error('[dev] Failed to start development environment:', err.message);
    process.exit(1);
});

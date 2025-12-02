#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const ports = [4000, 4001];

function getUnixPids(port) {
    const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });

    if (result.error) {
        throw new Error(`Unable to inspect port ${port}: ${result.error.message}`);
    }

    // lsof returns exit code 1 when nothing is listening on the port, so treat that as empty.
    if (result.status !== 0 && result.status !== 1) {
        const stderr = (result.stderr || '').toString().trim();
        throw new Error(`lsof failed for port ${port}: ${stderr || `exit status ${result.status}`}`);
    }

    return result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((pid) => parseInt(pid, 10))
        .filter((pid) => !Number.isNaN(pid));
}

function getWindowsPids(port) {
    const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });

    if (result.error) {
        throw new Error(`Unable to inspect netstat output for port ${port}: ${result.error.message}`);
    }

    if (result.status !== 0) {
        const stderr = (result.stderr || '').toString().trim();
        throw new Error(`netstat failed: ${stderr || `exit status ${result.status}`}`);
    }

    const lines = result.stdout.split(/\r?\n/);
    const pids = new Set();

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        // Example: TCP    0.0.0.0:4000   0.0.0.0:0   LISTENING   12345
        if (!line.toLowerCase().startsWith('tcp')) continue;
        const parts = line.split(/\s+/);
        if (parts.length < 5) continue;

        const localAddress = parts[1];
        if (!localAddress.endsWith(`:${port}`)) continue;

        const pid = parseInt(parts[parts.length - 1], 10);
        if (!Number.isNaN(pid)) {
            pids.add(pid);
        }
    }

    return Array.from(pids);
}

function getPids(port) {
    if (process.platform === 'win32') {
        return getWindowsPids(port);
    }
    return getUnixPids(port);
}

function killPid(pid, port) {
    try {
        process.kill(pid);
        console.log(`Killed process ${pid} on port ${port}`);
        return;
    } catch (error) {
        if (error.code === 'ESRCH') {
            console.log(`Process ${pid} on port ${port} already stopped`);
            return;
        }

        if (process.platform === 'win32') {
            const result = spawnSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore' });
            if (result.status === 0) {
                console.log(`Killed process ${pid} on port ${port} via taskkill`);
                return;
            }
        } else {
            const result = spawnSync('kill', ['-9', String(pid)], { stdio: 'ignore' });
            if (result.status === 0) {
                console.log(`Killed process ${pid} on port ${port} via kill -9`);
                return;
            }
        }

        console.warn(`Failed to terminate process ${pid} on port ${port}: ${error.message}`);
    }
}

function ensurePortIsFree(port) {
    let pids;
    try {
        pids = getPids(port);
    } catch (error) {
        console.warn(error.message);
        return;
    }

    if (pids.length === 0) {
        console.log(`No process listening on port ${port}`);
        return;
    }

    pids.forEach((pid) => killPid(pid, port));
}

ports.forEach(ensurePortIsFree);

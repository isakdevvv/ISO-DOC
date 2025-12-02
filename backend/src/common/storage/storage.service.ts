import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import * as path from 'path';

export type StorageDriver = 'local' | 'supabase';

interface UploadObjectParams {
    bucket: string;
    objectKey: string;
    body: Buffer;
    contentType?: string;
    checksum?: string;
    driver?: StorageDriver;
}

export interface ParsedStorageKey {
    driver: StorageDriver | 'legacy';
    bucket?: string;
    objectKey?: string;
    localPath?: string;
    raw: string;
}

interface DownloadResult {
    stream: Readable;
    size?: number;
    mimeType?: string;
}

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private driver: StorageDriver;
    private readonly localRoot: string;
    private readonly supabaseUrl?: string;
    private readonly supabaseKey?: string;

    constructor(private readonly configService: ConfigService) {
        this.driver = (this.configService.get<StorageDriver>('STORAGE_DRIVER') ?? 'local');
        this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        this.supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        this.localRoot = path.join(process.cwd(), 'uploads', 'storage');

        if (this.driver === 'supabase' && (!this.supabaseUrl || !this.supabaseKey)) {
            this.logger.warn('Supabase storage driver configured without SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Falling back to local storage.');
            this.driver = 'local';
        }
    }

    buildStorageKey(bucket: string, objectKey: string, driver: StorageDriver = this.driver) {
        return `${driver}://${bucket}/${objectKey}`;
    }

    parseStorageKey(key: string): ParsedStorageKey {
        if (!key) {
            return { driver: 'legacy', localPath: undefined, raw: key };
        }

        if (key.includes('://')) {
            const [scheme, rest] = key.split('://');
            const [bucket, ...pathParts] = rest.split('/');
            const driver = (scheme as StorageDriver) ?? 'local';
            const objectKey = pathParts.join('/');
            const parsed: ParsedStorageKey = {
                driver,
                bucket,
                objectKey,
                raw: key,
            };

            if (driver === 'local' && bucket) {
                parsed.localPath = path.join(this.localRoot, bucket, objectKey);
            }

            return parsed;
        }

        const resolved = path.isAbsolute(key) ? key : path.join(process.cwd(), key);
        return {
            driver: 'legacy',
            localPath: resolved,
            raw: key,
        };
    }

    async uploadObject(params: UploadObjectParams) {
        const driver = params.driver ?? this.driver;
        if (driver === 'supabase') {
            await this.uploadToSupabase(params);
            return;
        }
        await this.uploadToLocal(params);
    }

    async getObjectStream(key: string): Promise<DownloadResult> {
        const parsed = this.parseStorageKey(key);
        if (parsed.driver === 'supabase') {
            return this.downloadFromSupabase(parsed);
        }
        return this.downloadFromLocal(parsed);
    }

    private async uploadToLocal(params: UploadObjectParams) {
        const targetPath = path.join(this.localRoot, params.bucket, params.objectKey);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, params.body);
    }

    private async uploadToSupabase(params: UploadObjectParams) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        const encodedPath = params.objectKey
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');

        const url = `${this.supabaseUrl}/storage/v1/object/${params.bucket}/${encodedPath}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.supabaseKey}`,
                'Content-Type': params.contentType ?? 'application/octet-stream',
                'x-upsert': 'true',
            },
            body: params.body as unknown as BodyInit,
        });

        if (!response.ok) {
            const errorPayload = await response.text();
            throw new Error(`Failed to upload to Supabase (${response.status}): ${errorPayload}`);
        }
    }

    private async downloadFromLocal(parsed: ParsedStorageKey): Promise<DownloadResult> {
        let targetPath = parsed.localPath;

        if (!targetPath && parsed.bucket && parsed.objectKey) {
            targetPath = path.join(this.localRoot, parsed.bucket, parsed.objectKey);
        }

        if (!targetPath) {
            throw new Error('Local path missing for stored object');
        }

        const stream = createReadStream(targetPath);
        return { stream };
    }

    private async downloadFromSupabase(parsed: ParsedStorageKey): Promise<DownloadResult> {
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Supabase configuration missing');
        }
        if (!parsed.bucket || !parsed.objectKey) {
            throw new Error('Invalid storage key');
        }

        const encodedPath = parsed.objectKey
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        const url = `${this.supabaseUrl}/storage/v1/object/${parsed.bucket}/${encodedPath}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.supabaseKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download from Supabase (${response.status})`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return {
            stream: Readable.from(buffer),
            size: buffer.length,
            mimeType: response.headers.get('content-type') ?? undefined,
        };
    }
}

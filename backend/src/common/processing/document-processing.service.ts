import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs';

const pdf = require('pdf-parse');
const mammoth = require('mammoth');

interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
    keepSeparator?: boolean;
}

@Injectable()
export class DocumentProcessingService {
    async extractText(filePath: string): Promise<string> {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const dataBuffer = fs.readFileSync(filePath);

        switch (ext) {
            case 'pdf':
                return (await pdf(dataBuffer)).text;
            case 'json':
                return JSON.stringify(JSON.parse(dataBuffer.toString('utf-8')), null, 2);
            case 'txt':
                return dataBuffer.toString('utf-8');
            case 'docx': {
                const result = await mammoth.extractRawText({ buffer: dataBuffer });
                return result.value;
            }
            default:
                throw new Error(`Unsupported file type: .${ext}`);
        }
    }

    async chunkText(text: string, options: ChunkOptions = {}) {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: options.chunkSize ?? 1000,
            chunkOverlap: options.chunkOverlap ?? 200,
            separators: options.separators,
            keepSeparator: options.keepSeparator,
        });
        return splitter.createDocuments([text]);
    }
}

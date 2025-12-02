import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_CHAT_MODEL = 'openai/gpt-4o-mini';

@Injectable()
export class AiClientFactory {
    private readonly logger = new Logger(AiClientFactory.name);
    private readonly apiKey = process.env.OPENROUTER_API_KEY;
    private readonly embeddingsCache = new Map<string, OpenAIEmbeddings>();
    private readonly chatCache = new Map<string, ChatOpenAI>();

    private ensureApiKey() {
        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is not configured');
        }
    }

    getEmbeddings(modelName: string = DEFAULT_EMBEDDING_MODEL) {
        this.ensureApiKey();
        if (!this.embeddingsCache.has(modelName)) {
            this.logger.debug(`Creating embeddings client for model ${modelName}`);
            this.embeddingsCache.set(
                modelName,
                new OpenAIEmbeddings({
                    apiKey: this.apiKey!,
                    configuration: {
                        baseURL: OPENROUTER_BASE_URL,
                    },
                    modelName,
                }),
            );
        }
        return this.embeddingsCache.get(modelName)!;
    }

    getChatModel(modelName: string = DEFAULT_CHAT_MODEL, temperature = 0) {
        this.ensureApiKey();
        const cacheKey = `${modelName}:${temperature}`;
        if (!this.chatCache.has(cacheKey)) {
            this.logger.debug(`Creating chat model for ${modelName} (temp=${temperature})`);
            this.chatCache.set(
                cacheKey,
                new ChatOpenAI({
                    apiKey: this.apiKey!,
                    configuration: {
                        baseURL: OPENROUTER_BASE_URL,
                    },
                    modelName,
                    temperature,
                }),
            );
        }
        return this.chatCache.get(cacheKey)!;
    }
}

import { Global, Module } from '@nestjs/common';

import { AiClientFactory } from './ai-client.factory';

@Global()
@Module({
    providers: [AiClientFactory],
    exports: [AiClientFactory],
})
export class AiModule { }

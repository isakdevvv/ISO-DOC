import { Global, Module } from '@nestjs/common';
import { DocumentProcessingService } from './document-processing.service';

@Global()
@Module({
    providers: [DocumentProcessingService],
    exports: [DocumentProcessingService],
})
export class ProcessingModule { }

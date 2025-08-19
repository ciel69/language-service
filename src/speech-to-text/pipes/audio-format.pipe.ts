import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class AudioFormatValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('No audio file provided');
    }

    const validMimeTypes = [
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/mpeg',
      'audio/ogg',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!validMimeTypes.includes(value.mimetype)) {
      throw new BadRequestException(
        `Unsupported audio format. Supported types: ${validMimeTypes.join(', ')}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  }
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateKanaDto } from './create-kana.dto';

export class UpdateKanaDto extends PartialType(CreateKanaDto) {}

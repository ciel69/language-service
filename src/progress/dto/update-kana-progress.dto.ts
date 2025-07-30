import { PartialType } from '@nestjs/mapped-types';
import { CreateKanaProgressDto } from '@/progress/dto/create-kana-progress.dto';

export class UpdateKanaProgressDto extends PartialType(CreateKanaProgressDto) {}

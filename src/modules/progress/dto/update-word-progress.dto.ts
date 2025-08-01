import { PartialType } from '@nestjs/mapped-types';
import { CreateWordProgressDto } from '@/modules/progress/dto/create-word-progress.dto';

export class UpdateWordProgressDto extends PartialType(CreateWordProgressDto) {}

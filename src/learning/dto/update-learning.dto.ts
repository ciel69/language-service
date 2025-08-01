import { PartialType } from '@nestjs/mapped-types';
import { CreateLearningDto } from './create-learning.dto';

export class UpdateLearningDto extends PartialType(CreateLearningDto) {}

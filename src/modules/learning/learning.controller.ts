import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LearningService } from './learning.service';
import { CreateLearningDto } from './dto/create-learning.dto';
import { UpdateLearningDto } from './dto/update-learning.dto';
import { Public } from 'nest-keycloak-connect';

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  create(@Body() createLearningDto: CreateLearningDto) {
    return this.learningService.create(createLearningDto);
  }

  @Get()
  findAll() {
    return this.learningService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.learningService.findAllWithModulesAndProgressForUser(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLearningDto: UpdateLearningDto,
  ) {
    return this.learningService.update(+id, updateLearningDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.learningService.remove(+id);
  }
}

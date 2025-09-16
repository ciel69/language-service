import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Request } from 'express';
import { KeycloakJwtPayload } from '@/modules/auth/interfaces/keycloak-payload.interface';

@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonService.create(createLessonDto);
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() req: Request,
  ) {
    return this.lessonService.findAllWithHierarchy(
      +page,
      +limit,
      (req.user as KeycloakJwtPayload).sub,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return await this.lessonService.getStartDataForModuleOptimized(
      Number(id),
      (req.user as KeycloakJwtPayload).sub,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonService.update(+id, updateLessonDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lessonService.remove(+id);
  }
}

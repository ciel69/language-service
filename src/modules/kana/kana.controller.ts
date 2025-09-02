import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { KanaService } from './kana.service';
import { CreateKanaDto } from './dto/create-kana.dto';
import { UpdateKanaDto } from './dto/update-kana.dto';
import { AuthGuard, Public } from 'nest-keycloak-connect';
import { KeycloakJwtPayload } from '@/auth/interfaces/keycloak-payload.interface';
import { AuthService } from '@/auth/auth.service';
import { Request } from 'express';

@Controller('kana')
export class KanaController {
  constructor(
    private readonly kanaService: KanaService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Body() createKanaDto: CreateKanaDto) {
    return this.kanaService.create(createKanaDto);
  }

  @Get()
  findAll() {
    return this.kanaService.getLessonPlan(1, 'hiragana');
  }

  @Get('hiragana/all')
  @UseGuards(AuthGuard)
  async findHiragana(@Req() req: Request) {
    const user = await this.authService.syncUserWithDatabase(
      req.user as KeycloakJwtPayload,
    );
    return this.kanaService.findSymbols('hiragana', user.id);
  }

  @Get('katakana/all')
  @UseGuards(AuthGuard)
  async findKatakana(@Req() req: Request) {
    const user = await this.authService.syncUserWithDatabase(
      req.user as KeycloakJwtPayload,
    );
    return this.kanaService.findSymbols('katakana', user.id);
  }

  @Get('lesson/:id')
  // @UseGuards(AuthGuard)
  @Public()
  findOne(@Param('id') id: string) {
    return this.kanaService.getLessonPlan(Number(id), 'hiragana');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKanaDto: UpdateKanaDto) {
    return this.kanaService.update(+id, updateKanaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kanaService.remove(+id);
  }
}

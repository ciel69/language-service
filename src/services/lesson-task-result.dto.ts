// import { IsInt, IsBoolean, Min, Max, IsOptional } from 'class-validator';
// import { ApiProperty } from '@nestjs/swagger';

export class LessonTaskResult {
  // @ApiProperty({
  //   example: 1,
  //   description: 'ID символа Kana',
  // })
  // @IsInt()
  kanaId: number;

  // @ApiProperty({
  //   example: true,
  //   description: 'Был ли ответ правильным?',
  // })
  // @IsBoolean()
  isCorrect: boolean;

  // @ApiProperty({
  //   example: 2500,
  //   description: 'Время, затраченное на задачу, в миллисекундах',
  //   required: false,
  // })
  // @IsOptional()
  // @IsInt()
  // @Min(0)
  timeSpentMs?: number;

  // Можно добавить другие метрики: количество попыток, выбранный вариант и т.д.
}

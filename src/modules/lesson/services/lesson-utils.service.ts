// src/lesson/service/lesson-utils.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class LessonUtilsService {
  getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot get random element from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomElements<T>(array: T[], count: number): T[] {
    if (array.length === 0) return [];
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getSymbolCombinationKey(symbols: { id: number }[]): string {
    return symbols
      .map((s) => s.id)
      .sort()
      .join('-');
  }

  determineTaskCount(symbolCount: number): number {
    if (symbolCount <= 5) return 12;
    if (symbolCount <= 8) return 18;
    if (symbolCount <= 12) return 20;
    return 22;
  }

  estimateLessonDuration(tasks: any[]): number {
    let totalSeconds = 0;
    tasks.forEach((task) => {
      switch (task.taskType) {
        case 'kana-recognition':
        case 'kana-reverse-recognition':
        case 'kanji-meaning':
        case 'kanji-reading':
        case 'flashcard':
          totalSeconds += 20;
          break;
        case 'kana-writing':
        case 'kanji-writing':
          totalSeconds += 35;
          break;
        case 'kana-stroke-order':
        case 'kanji-stroke-order':
          totalSeconds += 45;
          break;
        case 'kana-audio':
          totalSeconds += 25;
          break;
        case 'pairing':
        case 'kanji-reading-multiple':
          totalSeconds += 60;
          break;
        case 'kanji-detail-info':
          totalSeconds += 30;
          break;
        default:
          totalSeconds += 30;
      }
    });
    return Math.round(totalSeconds / 60);
  }
}

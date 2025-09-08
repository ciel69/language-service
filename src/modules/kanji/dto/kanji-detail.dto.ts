import { KanjiProgressInfoDto } from './kanji-with-progress.dto';

export class WordDto {
  id: number;
  word: string;
  kana: string;
  romaji: string;
  meaning: string;
  category: string;
  level: string;
}

export class KanjiDetailDto {
  id: number;
  char: string;
  on: string[];
  kun: string[];
  meaning: string;
  level: string;
  progress: KanjiProgressInfoDto | null;
  words: WordDto[];
}

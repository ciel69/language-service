export class KanjiProgressInfoDto {
  id: number;
  progress: number;
  correctAttempts: number;
  incorrectAttempts: number;
  perceivedDifficulty: number;
  nextReviewAt: Date | null;
  stage: string;
  createdAt: Date;
  updatedAt: Date;
}

export class KanjiWithProgressDto {
  id: number;
  char: string;
  on: string[];
  kun: string[];
  meaning: string;
  level: string;
  progress: KanjiProgressInfoDto | null;
}

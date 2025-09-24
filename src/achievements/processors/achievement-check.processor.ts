import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AchievementJobData } from '@/achievements/queues/achievement-check.queue';
import { AchievementsService } from '@/achievements/achievements.service';

@Processor('achievement-check')
export class AchievementCheckProcessor extends WorkerHost {
  constructor(private readonly achievementService: AchievementsService) {
    super();
  }

  async process(job: Job<AchievementJobData, any, string>) {
    const { userId, keycloakId } = job.data;
    const jobType = job.name;

    console.log(`[ACHIEVEMENT] Processing ${jobType} for user ${userId}`);

    try {
      switch (jobType) {
        case 'check-achievements-for-user':
          await this.achievementService.checkAndAwardAchievements(userId);
          await this.achievementService.checkStreakAchievements(
            userId,
            keycloakId,
          );
          break;

        case 'word-audio':
          await this.achievementService.checkWordAudioAchievements(userId);
          break;

        case 'kana-recognition':
          await this.achievementService.checkKanaAchievements(userId);
          break;

        case 'streak-7-days':
          await this.achievementService.checkStreakAchievements(
            userId,
            keycloakId,
          );
          break;

        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      console.error(`Failed to process ${jobType} for user ${userId}`, error);
      throw error;
    }
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAchievementTable1234567890000
  implements MigrationInterface
{
  name = 'CreateUserAchievementTable1234567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем таблицу user_achievement
    await queryRunner.query(`
            CREATE TABLE "user_achievement" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "achievement_id" integer NOT NULL,
                "achieved_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "progress" integer NOT NULL DEFAULT '0',
                "is_achieved" boolean NOT NULL DEFAULT false,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_user_achievement_id" PRIMARY KEY ("id")
            )
        `);

    // Добавляем внешний ключ для user_id
    await queryRunner.query(`
            ALTER TABLE "user_achievement" 
            ADD CONSTRAINT "FK_user_achievement_user" 
            FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
        `);

    // Добавляем внешний ключ для achievement_id
    await queryRunner.query(`
            ALTER TABLE "user_achievement" 
            ADD CONSTRAINT "FK_user_achievement_achievement" 
            FOREIGN KEY ("achievement_id") REFERENCES "achievement"("id") ON DELETE CASCADE
        `);

    // Создаем индексы
    await queryRunner.query(
      `CREATE INDEX "IDX_user_achievement_user_id" ON "user_achievement" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_achievement_achievement_id" ON "user_achievement" ("achievement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_achievement_is_achieved" ON "user_achievement" ("is_achieved")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем внешние ключи
    await queryRunner.query(
      `ALTER TABLE "user_achievement" DROP CONSTRAINT "FK_user_achievement_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievement" DROP CONSTRAINT "FK_user_achievement_user"`,
    );

    // Удаляем таблицу
    await queryRunner.query(`DROP TABLE "user_achievement"`);
  }
}

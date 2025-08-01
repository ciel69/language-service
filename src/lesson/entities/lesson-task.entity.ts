// src/lesson/entities/lesson-task.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { BaseTaskConfig } from '@/lesson/type/lesson-task-config.interface';
// 1. Импортируем константу и выведенный тип
// Импортируем интерфейсы конфигов, если они определены в отдельных файлах
// import { BaseTaskConfig } from './lesson-task-config.interface';

// src/lesson/entities/constants/task-types.const.ts
// Или, например, src/lesson/entities/lesson-task.constants.ts

/**
 * Перечисление всех возможных типов задач (LessonTask).
 * Используется для строгой типизации поля taskType в LessonTask.entity
 * и для определения допустимых значений в базе данных.
 */
export const LESSON_TASK_TYPES = [
  // --- Типы для Kana ---
  'kana',
  'kana-recognition', // Распознавание символа (показать кана -> выбрать ромадзи)
  'kana-writing', // Написание символа
  'kana-audio', // Аудирование (проиграть звук -> выбрать кана/ромадзи)
  'kana-stroke-order', // Порядок черт (для кандзи/кана)

  // --- Типы для Kanji ---
  'kanji',
  'kanji-meaning', // Выбор значения кандзи
  'kanji-reading', // Выбор чтения кандзи (он/кун)
  'kanji-compounds', // Слова из кандзи
  'kanji-writing', // Написание кандзи

  // --- Типы для Word ---
  'word',
  'word-meaning', // Перевод слова
  'word-usage', // Использование слова в контексте
  'word-audio', // Аудирование слова

  // --- Типы для Grammar (берем значения из GrammarExerciseType) ---
  'particle-choice', // Выбор частицы
  'sentence-building', // Построение предложения
  'fill-in-the-blank', // Заполнить пропуск
  'word-order', // Порядок слов
  'multiple-choice', // Множественный выбор (грамматика)
  'grammar', // Найти пару

  // --- Типы для Pairing (Сопоставление) ---
  'pairing', // Найти пару

  // --- Общие/Комбинированные типы ---
  'flashcard', // Карточка (показать/скрыть)
  // 'multiple-choice',    // Множественный выбор (общий) - уже есть у грамматики, можно удалить или уточнить
  // 'fill-in-the-blank',  // Заполнить пропуск (общий) - уже есть у грамматики
  'sorting', // Сортировка элементов
  'dictation', // Диктант (аудио -> написание)
  'custom', // Пользовательская/специфичная задача

  // Добавьте другие типы по мере необходимости
] as const; // Утверждение `as const` делает массив кортежем (tuple) неизменяемых строк

/**
 * Тип, выводимый из константы LESSON_TASK_TYPES.
 * Представляет собой объединение (union) всех допустимых строковых литералов.
 * @example 'kana-recognition' | 'kanji-meaning' | 'particle-choice' | ...
 */
export type LessonTaskType = (typeof LESSON_TASK_TYPES)[number];

/**
 * Представляет собой одну задачу (упражнение) внутри урока.
 * Связывает урок с конкретным типом задания и источником данных (taskId),
 * а также содержит всю конфигурацию для отображения и проверки этой задачи.
 */
@Entity()
@Index(['lessonId', 'order']) // Для быстрой сортировки задач в уроке
@Index(['taskType', 'taskId']) // Для поиска задач по типу и источнику
export class LessonTask {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Связь с уроком, к которому принадлежит эта задача.
   */
  @ManyToOne(() => Lesson, (lesson) => lesson.tasks, {
    onDelete: 'CASCADE', // При удалении урока удаляются и его задачи
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column()
  lessonId: number;

  /**
   * Порядковый номер задачи в уроке.
   * Определяет последовательность выполнения задач.
   */
  @Column({ type: 'int' })
  order: number;

  /**
   * Тип задачи.
   * Определяет, какой компонент упражнения нужно отрендерить на фронтенде
   * и какую логику проверки использовать.
   * Значения берутся из константы LESSON_TASK_TYPES.
   */
  @Column({
    type: 'enum',
    // 2. Используем импортированную константу для определения enum
    enum: LESSON_TASK_TYPES,
  })
  taskType: LessonTaskType; // 3. Используем импортированный тип

  /**
   * ID сущности, на которую ссылается эта задача.
   * Тип сущности определяется полем `taskType`.
   * @example Для taskType='kana' это будет id из таблицы `kana`.
   * @example Для taskType='grammar' это будет id из таблицы `grammar`.
   */
  @Column()
  taskId: number;

  /**
   * Варианты ответов или элементы для задачи.
   * Используется, когда варианты фиксированы для этой конкретной задачи.
   * @example ["а", "и", "у", "э", "о"] для задачи распознавания 'あ'.
   * @example null если варианты генерируются динамически или берутся из связанной сущности.
   *
   * Для задач типа 'pairing', если варианты хранятся здесь:
   * @example [{left: "ねこ", right: "/images/cat.png"}, {left: "いぬ", right: "/images/dog.png"}]
   */
  @Column('simple-json', { nullable: true }) // Используем simple-json для массивов/объектов
  options: string[] | { left: string; right: string }[] | null;

  /**
   * Правильный ответ(ы) для этой задачи.
   * @example ["а"] для задачи распознавания 'あ'.
   * @example ["は", "を"] для задачи выбора частиц.
   * @example null если правильный ответ определяется логикой (например, совпадение по ID из taskId).
   */
  @Column('simple-json', { nullable: true })
  correctAnswer: string[] | null;

  /**
   * Строго типизированная конфигурация задачи.
   * Содержит параметры отображения, логики, генерации вариантов и т.д.,
   * специфичные для `taskType`.
   * @example { mode: 'show_symbol', options_count: 4 } для 'kana-recognition'.
   * @example { mode: 'particle-choice', sentence: '彼は___食べる。', options: [...] } для грамматики.
   * @example { mode: 'word-to-image', pairs: [...] } для 'pairing'.
   */
  @Column('json', { nullable: true }) // json для сложных структур
  config: BaseTaskConfig | null; // Используем Record для гибкости, типизацию можно уточнить позже

  // --- Вспомогательные методы (опционально) ---
  // getTypeSpecificConfig(): TaskConfigMap[this['taskType']] | null {
  //   return this.config as TaskConfigMap[this['taskType']] | null;
  // }
}

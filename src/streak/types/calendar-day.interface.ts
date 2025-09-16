export interface CalendarDay {
  date: string; // ISO format: "2025-09-16"
  hasActivity: boolean; // true если был активен ИЛИ заморожен
  streakDay: number; // текущий номер дня в страйке (1, 2, 3...)
  currencyEarned: number; // сколько валюты получено в этот день
}

export interface TelegramUser {
  allows_write_to_pm: boolean;
  first_name: string;
  id: string;
  is_premium: boolean;
  last_name?: string; // Необязательное поле
  language_code: string;
  photo_url?: string; // Необязательное поле
  username: string; // Необязательное поле
}

export interface TelegramInitData {
  auth_date: string; // ISO строка даты
  hash: string;
  query_id: string;
  signature: string;
  user: TelegramUser;
}

export type TgBody = {
  id: string;
  username: string;
  initData?: string;
};

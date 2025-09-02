import * as crypto from 'crypto';

/**
 * Хеширует IP-адрес с нормализацией и защитой от некорректных данных
 */
export function hashIp(ip: string | undefined | null): string {
  if (!ip || typeof ip !== 'string') {
    return crypto.createHash('sha256').update('unknown').digest('hex');
  }

  // Очищаем и приводим к нижнему регистру
  let cleanedIp = ip.trim().toLowerCase();

  // Удаляем возможные порты: 95.123.45.67:3000 → 95.123.45.67
  cleanedIp = cleanedIp.split(':')[0];

  // Удаляем квадратные скобки у IPv6: [2001:db8::1] → 2001:db8::1
  cleanedIp = cleanedIp.replace(/^\[|\]$/g, '');

  // Нормализация: убираем ведущие нули в IPv4 (опционально)
  // 192.168.001.001 → 192.168.1.1
  cleanedIp = cleanedIp.replace(/\b0+(\d+)/g, '$1');

  // Если после очистки пусто — метим как unknown
  if (!cleanedIp || cleanedIp === '::1' || cleanedIp === '127.0.0.1') {
    cleanedIp = 'localhost';
  }

  return crypto.createHash('sha256').update(cleanedIp).digest('hex');
}

import { Request } from 'express';

export function getClientIp(request: Request): string {
  // Порядок проверки — от самого надёжного к резервным
  const ip =
    // Cloudflare
    request.headers['cf-connecting-ip'] ||
    request.headers['true-client-ip'] ||
    // Nginx / прокси
    request.headers['x-real-ip'] ||
    request.headers['x-client-ip'] ||
    // X-Forwarded-For: "client, proxy1, proxy2"
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    // Стандартный IP из Express/Fastify
    (request as any).socket?.remoteAddress ||
    // Последний вариант
    request['ip'];

  return (ip || 'unknown').toString().trim();
}

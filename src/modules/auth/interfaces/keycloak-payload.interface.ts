export interface KeycloakJwtPayload {
  // Обязательные поля JWT
  exp: number; // Время истечения токена (Unix timestamp)
  iat: number; // Время выпуска токена (Unix timestamp)
  jti: string; // JWT ID
  iss: string; // Издатель (Issuer) - URL вашего Keycloak realm
  aud: string | string[]; // Аудитория (Audience) - client ID
  sub: string; // Subject - UUID пользователя в Keycloak
  typ: string; // Тип токена (обычно "Bearer")
  azp: string; // Authorized party - client ID

  // Поля пользователя Keycloak
  preferred_username: string; // Предпочтительное имя пользователя
  email?: string; // Email (если запрошен scope email)
  email_verified?: boolean; // Подтвержден ли email
  name?: string; // Полное имя
  given_name?: string; // Имя
  family_name?: string; // Фамилия
  picture?: string; // URL аватара (если есть)

  // Роли и разрешения
  realm_access?: {
    roles: string[]; // Роли на уровне realm
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[]; // Роли на уровне клиента
    };
  };

  // Дополнительные поля (зависят от настроек Keycloak)
  locale?: string; // Локаль пользователя
  zoneinfo?: string; // Часовой пояс
  updated_at?: number; // Время последнего обновления

  // Scope и другие поля
  scope?: string; // Запрошенные scope
  session_state?: string; // ID сессии
  acr?: string; // Authentication Context Class Reference
  allowed_origins?: string[]; // Разрешенные origins
  sid?: string; // Session ID
}

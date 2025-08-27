# Используем официальный образ Node.js
FROM node:20 as build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Используем минимальный образ для запуска
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем собранный проект из предыдущего этапа
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/tsconfig.json ./

# Устанавливаем зависимости без dev-зависимостей
RUN npm install --production --legacy-peer-deps

# Запускаем приложение
CMD ["node", "dist/src/main"]

# Проектная работа "WebLarek. Плохой сервер.", спринт 17

## Информация об авторе

- **Репозиторий:** https://github.com/SergeyLozin/bad-server
- **Автор:** Сергей Лозин
- **Когорта:** 48 фулстек — расширенный


## Подготовка к работе

1. Склонировать репозиторий
2. Запустить docker

```bash
docker compose up -d
```

3. Наполнить базу данных — инструкция в [.dump/README.md](.dump/README.md)
4. Перейти по адресу http://localhost/ — должны отображаться товары
5. Авторизация: http://localhost/login/
6. Админка: http://localhost/admin/

### Тестовые аккаунты

| Роль | Email | Пароль |
|---|---|---|
| Администратор | `admin@mail.ru` | `password` |
| Покупатель | `user1@mail.ru` | `password1` |

> ⚠️ После применения security-фиксов (MD5 → bcrypt) пользователей необходимо пересоздать. Пароли в базе теперь хранятся в bcrypt-хеше, а старые MD5-хеши не работают.

---

## Отчёт по безопасности

В ходе проектной работы был проведён аудит безопасности приложения и устранение уязвимостей, указанных в требованиях. Все исправления внесены в ветку `review` и объединены в `main` одним squash-коммитом.

### XSS (Межсайтовый скриптинг)

| Файл | Проблема | Исправление |
|---|---|---|
| `frontend/src/components/admin/admin-order-detail.tsx` | Комментарий к заказу рендерился через `dangerouslySetInnerHTML` — stored XSS в админ-панели | Заменено на безопасный JSX-рендер (React экранирует автоматически) |
| `frontend/src/components/profile/profile-order-detail.tsx` | То же в профиле пользователя | Аналогично |
| `backend/src/middlewares/validations.ts` | `image.originalName` без ограничений | Добавлены `.max()`, `.pattern()`, `.unknown(false)` |
| `backend/src/middlewares/file.ts` | Разрешён `image/svg+xml` — SVG может содержать JS | SVG исключён из разрешённых типов |

### CSRF (Межсайтовая подделка запросов)

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/middlewares/csrf.ts` (новый) | CSRF-защиты не было | Реализован double-submit cookie: токен в куке + заголовок `x-csrf-token` |
| `backend/src/app.ts` | — | Подключены `setCsrfToken` и `checkCsrfToken` |
| `frontend/src/utils/weblarek-api.ts` | Фронт не отправлял CSRF-токен | Читает куку `csrfToken`, добавляет заголовок `x-csrf-token` на все POST/PATCH/PUT/DELETE |
| `backend/src/routes/auth.ts` | `/logout`, `/token` — GET-запросы | Изменено на POST |
| `backend/src/config.ts` | Кука `sameSite: 'lax'` | Изменено на `sameSite: 'strict'`, `secure` в проде |

### NoSQL-инъекции

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/controllers/order.ts` | `status` принимал объект (`Object.assign(filters, status)`) — можно было подсунуть `$ne`, `$gt` и т.д. | Принимается только строка; celebrate/Joi валидирует |
| `backend/src/routes/auth.ts` | `/login`, `/register` без валидации celebrate | Добавлены `validateAuthentication`, `validateUserBody` |
| `backend/src/models/user.ts` | `findOne({ email })` без приведения к строке | `findOne({ email: String(email) })` |
| `backend/src/middlewares/validations.ts` | Схемы celebrate не блокировали лишние поля | Добавлен `.unknown(false)` |

### ReDoS (Regular Expression Denial of Service)

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/controllers/customers.ts` | `new RegExp(search)` из query | Экранирование через `escapeRegExp`, ограничение длины 100 символов |
| `backend/src/controllers/order.ts` | То же в `getOrders`, `getOrdersCurrentUser` | Аналогично |
| `backend/src/middlewares/validations.ts` | `phoneRegExp` с вложенными квантификаторами | Заменён на линейный `/^\+?[\d\s()-]{7,20}$/` |

### DDoS (Distributed Denial of Service)

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/app.ts` | Нет rate limiting | `express-rate-limit` — 100 запросов/мин с одного IP |
| `backend/src/app.ts` | Тело запроса без лимита | `json({ limit: '100kb' })`, `urlencoded({ limit: '100kb' })` |
| `backend/src/app.ts` | Нет security-заголовков | `helmet()` — убирает `X-Powered-By`, добавляет CSP, HSTS и др. |
| `backend/src/app.ts` | CORS `*` | Белый список через `ORIGIN_ALLOW` |
| `backend/src/middlewares/error-handler.ts` | `console.log(err)` на каждый запрос — забивает логи | Логирование только 500-ошибок, только в `stderr` |

### Переполнение буфера

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/middlewares/file.ts` | Нет лимита размера файла | `fileSize: 5 * 1024 * 1024` (5 MB), `files: 1`, `fields: 10` |
| `backend/src/middlewares/upload.ts` (новый) | Ошибки multer не обрабатывались | Обёртка `uploadSingleFile` — `LIMIT_FILE_SIZE` → 400 |
| `backend/src/app.ts` | Нет лимита на JSON/urlencoded | 100 KB на оба |
| `backend/src/middlewares/validations.ts` | Нет `.max()` для строковых полей | Добавлены `.max()` для `comment`, `address`, `password` и др. |

### Path Traversal

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/middlewares/file.ts` | `filename: file.originalname` — атакующий контролирует имя файла | Генерация имени через `crypto.randomUUID()` + `extname` |
| `backend/src/middlewares/serverStatic.ts` | `path.join(baseDir, req.path)` — можно выйти за пределы `public/` | Проверка `filePath.startsWith(root + sep)` |
| `backend/src/utils/movingFile.ts` | `throw` внутри callback `rename` — uncaught exception | `await renameAsync` + проверка `startsWith` |
| `backend/src/controllers/upload.ts` | Имя файла из `req.file.filename` без проверки | `path.basename()` |

### Прочие уязвимости

| Файл | Проблема | Исправление |
|---|---|---|
| `backend/src/models/user.ts` | **MD5** для паролей, без соли, сравнение `===` | **bcrypt** (10 раундов) + `bcrypt.compare` |
| `backend/src/controllers/auth.ts` | Mass Assignment в `updateCurrentUser` | Whitelist полей `['name', 'email']` |
| `backend/src/controllers/customers.ts` | Mass Assignment в `updateCustomer` | Whitelist полей `['name', 'email', 'phone']` |
| `backend/src/controllers/products.ts` | Mass Assignment в `updateProduct` | Whitelist полей товара |
| `backend/src/routes/customers.ts` | **IDOR** — любой юзер видел всех клиентов | `roleGuardMiddleware(Role.Admin)` на все роуты |
| `backend/src/routes/order.ts` | IDOR — `/order/all` доступен всем | `roleGuardMiddleware(Role.Admin)` |
| `backend/src/config.ts` | Fallback-секреты JWT (`'secret-dev'`) в проде | `requireEnv()` — обязательные env-переменные в проде |

---

## Проверка качества

### Аудит npm-зависимостей

```bash
cd backend && npm audit
cd frontend && npm audit
```

- **Backend:** `0 vulnerabilities` (обновлены `mongoose`, `express`, `jsonwebtoken`, `validator` и др.; для `lodash` использован `overrides`)
- **Frontend:** 2 moderate в `react-router-dom@6.x` — исправлено **только в 7.x** (major breaking change, не выполнен). Остаточный риск задокументирован: open redirect не эксплуатируется (все ссылки статичные), SSR не используется.

### Линтер

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

- **Backend:** 0 errors, 0 warnings
- **Frontend:** 0 errors, 18 warnings (`react-hooks/exhaustive-deps`, `@typescript-eslint/no-explicit-any`) — понижены до `warn`, не валят сборку

### Сборка

```bash
cd backend && npm run build
cd frontend && npm run build
```

Оба проекта собираются без ошибок типизации.

### Нагрузочное тестирование

```bash
ab -k -c 2000 -n 50000 http://localhost/
```

**Результат:** rate limiting срабатывает на 101-м запросе (HTTP 429). Сервер не падает, память стабильна, логи не переполняются.

---

## Требования к окружению

- Docker Desktop (или Docker Engine + Compose v2)
- Node.js 22+ (для локальной разработки без Docker)
- MongoDB 8.0.4 (поднимается в контейнере)

> ⚠️ Версия MongoDB зафиксирована на `8.0.4` — это связано с известной несовместимостью MongoDB 8.x с ядром Linux 6.19+ в Docker Desktop на macOS.

> ⚠️ **Если `npm run build` падает с `MODULE_NOT_FOUND @rollup/rollup-linux-*-musl`** — это известный баг npm 10.x с optional dependencies на Alpine Linux (https://github.com/npm/cli/issues/4828). **Docker-сборка работает корректно** — используйте `docker compose build frontend`. Локальная проверка `npm run build` требует дополнительно `npm install @rollup/rollup-linux-arm64-musl@^4 --save-optional` на ARM Mac.
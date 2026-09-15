import { CookieOptions } from 'express'
import ms from 'ms'

/**
 * Читает переменную окружения, бросает ошибку если её нет в проде.
 * В dev можно задать fallback.
 */
function requireEnv(name: string, devFallback?: string): string {
    const value = process.env[name] ?? devFallback
    if (!value) {
        throw new Error(
            `Отсутствует обязательная переменная окружения: ${name}`
        )
    }
    return value
}

export const { PORT = '3000' } = process.env
export const { DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env

const isProd = process.env.NODE_ENV === 'production'

export const JWT_SECRET = requireEnv(
    'JWT_SECRET',
    isProd ? undefined : 'dev-jwt-secret'
)

export const ACCESS_TOKEN = {
    // FIX: убран fallback в проде — секрет обязателен через env
    secret: requireEnv(
        'AUTH_ACCESS_TOKEN_SECRET',
        isProd ? undefined : 'dev-access-secret'
    ),
    expiry: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '10m',
}

export const REFRESH_TOKEN = {
    // FIX: убран fallback в проде — секрет обязателен через env
    secret: requireEnv(
        'AUTH_REFRESH_TOKEN_SECRET',
        isProd ? undefined : 'dev-refresh-secret'
    ),
    expiry: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d',
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            // FIX: sameSite=strict — защита от CSRF через куку
            sameSite: 'strict',
            // FIX: secure только в проде (для локального HTTP — false)
            secure: isProd,
            maxAge: ms(process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d'),
            path: '/',
        } as CookieOptions,
    },
}

// Белый список origins для CORS
export const ORIGIN_ALLOW =
    process.env.ORIGIN_ALLOW?.split(',').map((s) => s.trim()) ?? [
        'http://localhost',
        'http://localhost:5173',
    ]
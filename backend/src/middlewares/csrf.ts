import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import ForbiddenError from '../errors/forbidden-error'

const CSRF_COOKIE = '_csrf'
const CSRF_HEADER = 'x-csrf-token'

export const setCsrfToken = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.cookies?.[CSRF_COOKIE]) {
        const token = crypto.randomBytes(32).toString('hex')
        res.cookie(CSRF_COOKIE, token, {
            httpOnly: false,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        })
        // FIX: сохраняем в res.locals — контроллер вернёт тот же токен
        res.locals.csrfToken = token
    } else {
        res.locals.csrfToken = req.cookies[CSRF_COOKIE]
    }
    next()
}

export const checkCsrfToken = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }

    // Логин, регистрация, refresh — до аутентификации CSRF-куки у клиента может не быть
    const skipPaths = ['/auth/login', '/auth/register', '/auth/token']
    if (skipPaths.includes(req.path)) {
        return next()
    }

    const cookie = req.cookies?.[CSRF_COOKIE]
    const header = req.header(CSRF_HEADER)

    if (!cookie || !header || cookie !== header) {
        return next(new ForbiddenError('CSRF token invalid'))
    }
    return next()
}
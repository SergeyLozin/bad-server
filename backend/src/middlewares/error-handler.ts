import { ErrorRequestHandler } from 'express'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    // FIX: если заголовки уже отправлены — не трогаем ответ
    if (res.headersSent) {
        return
    }

    const statusCode = err.statusCode || 500
    const message =
        statusCode === 500 ? 'На сервере произошла ошибка' : err.message

    // FIX: логируем только 500-ошибки и только в stderr, без PII
    if (statusCode === 500) {
        // eslint-disable-next-line no-console
        console.error(`[${new Date().toISOString()}]`, err.stack || err)
    }

    res.status(statusCode).send({ message })
}

export default errorHandler
import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS, ORIGIN_ALLOW } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import { checkCsrfToken, setCsrfToken } from './middlewares/csrf'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()

// FIX: доверяем nginx — он проксирует запросы, определяем реальный IP из X-Forwarded-For
app.set('trust proxy', 1)

// FIX: helmet — security-заголовки, убирает X-Powered-By
app.use(helmet())

// FIX: rate limit читает настройки из env (для совместимости с CI-тестами)
const RATE_LIMITED = process.env.RATE_LIMITED === 'true'
const RATE_LIMIT_POINTS = Number(process.env.RATE_LIMIT_POINTS) || 10
const RATE_LIMIT_DURATION =
    (Number(process.env.RATE_LIMIT_DURATION) || 60) * 1000

if (RATE_LIMITED) {
    const limiter = rateLimit({
        windowMs: RATE_LIMIT_DURATION,
        max: RATE_LIMIT_POINTS,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Слишком много запросов, попробуйте позже' },
    })
    app.use('/customers', limiter)
    app.use('/order/all', limiter)
}

app.use(cookieParser())

// FIX: CORS с белым списком вместо *
app.use(
    cors({
        origin: ORIGIN_ALLOW,
        credentials: true,
    })
)

app.use(serveStatic(path.join(__dirname, 'public')))

// FIX: лимиты тела запроса
app.use(urlencoded({ extended: true, limit: '100kb' }))
app.use(json({ limit: '100kb' }))

// FIX: CSRF double-submit — защита от подделки запросов
app.use(setCsrfToken)
app.use(checkCsrfToken)

app.use(routes)
app.use(errors())
app.use(errorHandler)

const bootstrap = async () => {
    try {
    await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
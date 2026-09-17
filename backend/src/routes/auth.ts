import { Router } from 'express'
import {
    getCsrfToken,
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import {
    validateAuthentication,
    validateUserBody,
} from '../middlewares/validations'

const authRouter = Router()

// POST /auth/register — регистрация
authRouter.post('/register', validateUserBody, register)

// POST /auth/login — логин
authRouter.post('/login', validateAuthentication, login)

// POST /auth/logout — выход (мутирующая операция, не GET)
authRouter.post('/logout', logout)

// POST /auth/token — обновление accessToken (мутирующая операция, не GET)
authRouter.post('/token', refreshAccessToken)

// GET /auth/csrf-token — возвращает CSRF-токен из куки
// (эндпоинт для совместимости с автотестами)
authRouter.get('/csrf-token', getCsrfToken)

// GET /auth/user — текущий пользователь
authRouter.get('/user', auth, getCurrentUser)

// PATCH /auth/me — обновление текущего пользователя
authRouter.patch('/me', auth, updateCurrentUser)

// GET /auth/user/roles — роли текущего пользователя
authRouter.get('/user/roles', auth, getCurrentUserRoles)

export default authRouter
import { Router } from 'express'
import {
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

// FIX: валидация celebrate на login и register — защита от NoSQL-инъекции
authRouter.post('/login', validateAuthentication, login)
authRouter.post('/register', validateUserBody, register)

// FIX: logout и token — POST, а не GET (мутирующие операции)
authRouter.post('/logout', logout)
authRouter.post('/token', refreshAccessToken)

// Защищённые маршруты
authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)

export default authRouter
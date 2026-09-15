import { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import BadRequestError from '../errors/bad-request-error'
import fileMiddleware from './file'

export const uploadSingleFile = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    fileMiddleware.single('file')(req, res, (err) => {
        if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(
                    new BadRequestError('Файл слишком большой (макс 5 MB)')
                )
            }
            return next(
                new BadRequestError(`Ошибка загрузки файла: ${err.code}`)
            )
        }
        if (err) {
            return next(err)
        }
        return next()
    })
}

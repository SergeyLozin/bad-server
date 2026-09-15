import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import { resolve, sep } from 'path'

export default function serveStatic(baseDir: string) {
    const root = resolve(baseDir)
    return (req: Request, res: Response, next: NextFunction) => {
        // FIX: резолвим путь и проверяем, что он остаётся внутри root
        const filePath = resolve(root, '.' + req.path)
        if (!filePath.startsWith(root + sep) && filePath !== root) {
            return next()
        }

        // Проверяем, существует ли файл
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Файл не существует — отдаём дальше мидлварам
                return next()
            }
            // Файл существует — отправляем клиенту
            return res.sendFile(filePath, (err) => {
                if (err) {
                    next(err)
                }
            })
        })
    }
}
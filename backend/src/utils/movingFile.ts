import { existsSync, mkdirSync, rename } from 'fs'
import { basename, resolve, sep } from 'path'
import { promisify } from 'util'

const renameAsync = promisify(rename)

async function movingFile(imagePath: string, from: string, to: string) {
    // FIX: берём только имя файла — защита от path traversal через imagePath
    const fileName = basename(imagePath)

    // FIX: резолвим абсолютные пути и проверяем, что они внутри from/to
    const rootFrom = resolve(from)
    const rootTo = resolve(to)
    const imagePathTemp = resolve(rootFrom, fileName)
    const imagePathPermanent = resolve(rootTo, fileName)

    if (
        !imagePathTemp.startsWith(rootFrom + sep) ||
        !imagePathPermanent.startsWith(rootTo + sep)
    ) {
        throw new Error('Недопустимый путь к файлу')
    }

    mkdirSync(to, { recursive: true })

    if (!existsSync(imagePathTemp)) {
        throw new Error('Ошибка при сохранении файла')
    }

    // FIX: await вместо throw в callback — иначе uncaught exception убивает процесс
    await renameAsync(imagePathTemp, imagePathPermanent)
}

export default movingFile
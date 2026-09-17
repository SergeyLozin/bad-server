import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import { uploadSingleFile } from '../middlewares/upload'

const uploadRouter = Router()

uploadRouter.post('/', uploadSingleFile, uploadFile)

export default uploadRouter
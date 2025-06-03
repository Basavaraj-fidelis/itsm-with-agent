
import express from 'express'
import cors from 'cors'
import { router } from './routes'

export function createServer(): express.Application {
  const app = express()
  
  app.use(cors())
  app.use(express.json())
  app.use('/api', router)
  
  return app
}

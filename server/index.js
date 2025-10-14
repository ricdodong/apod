import express from 'express'
import path from 'path'
import fetch from 'node-fetch'
import morgan from 'morgan'
import nowPlayingRouter from './api/nowPlaying.js'
import { fileURLToPath } from 'url'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const app = express()
app.use(morgan('tiny'))


// Serve static Astro build (if you build to 'dist' later)
app.use(express.static(path.join(__dirname, '..', 'public')))


// API proxied endpoints
app.use('/api', nowPlayingRouter)


// Fallback to index.html (for SPA)
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})


const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server listening on ${PORT}`))
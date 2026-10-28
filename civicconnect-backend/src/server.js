const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const express = require('express')
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

const healthRoutes = require('./routes/healthRoutes')
const issueRoutes = require('./routes/issueRoutes')
const authRoutes = require('./routes/authRoutes')
const notificationRoutes = require('./routes/notificationRoutes')

const app = express()
const PORT = process.env.PORT || 5000
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5176'

// Allow requests from localhost, local network devices, and deployed frontends (Vercel)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
)

// Allow JSON requests, including base64 complaint photos.
app.use(express.json({ limit: '15mb' }))

// Basic API health message.
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the CivicConnect API',
    status: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_disconnected'
  })
})

// API routes.
app.use('/api/health', healthRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/notifications', notificationRoutes)

// Handle unknown endpoints.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  })
})

// Handle malformed JSON and other request-processing errors.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
    })
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large. Please use a smaller photo.',
    })
  }

  console.error('API error:', err.message)

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred',
  })
})

// Start listening immediately on 0.0.0.0 and PORT so cloud host health checks pass instantly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CivicConnect backend running on port ${PORT}`)
  console.log('Allowed frontend:', FRONTEND_URL)
})

// Connect to MongoDB in background
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully')
    })
    .catch((error) => {
      console.error('Failed to connect to MongoDB:', error.message)
    })
} else {
  console.error('MONGODB_URI is missing from environment variables!')
}

import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'

export const signAccessToken = (payload, expiresIn = '15m') =>
  jwt.sign(payload, env.jwtAccessSecret, { expiresIn })

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' })

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret)

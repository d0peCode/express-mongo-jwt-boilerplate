'use strict'

const express = require('express')
const router = express.Router()
const userRouter = require('./api/user.route')
const authRouter = require('./api/auth.route')

// api status
router.get('/status', (req, res) => { res.send({status: 'OK'}) })

router.use('/user', userRouter)
router.use('/auth', authRouter)

module.exports = router

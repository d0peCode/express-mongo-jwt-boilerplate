'use strict'
const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const httpStatus = require('http-status')
const APIError = require('../utils/APIError')
const transporter = require('../services/transporter')
const Schema = mongoose.Schema
const hashPass = require('./utils/hashPass')
const checkDuplicateEmailError = require('./utils/checkDuplicateEmailError')

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 128
  },
  name: {
    type: String,
    maxlength: 50
  },
  activationKey: {
    type: String,
    unique: true
  },
  active: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

hashPass(userSchema)

userSchema.post('save', async function saved (doc, next) {
  try {
    const mailOptions = {
      from: 'noreply',
      to: this.email,
      subject: 'Confirm creating account',
      html: `<div><h1>Hello new user!</h1><p>Click <a href="http://localhost:3000/api/user/confirm?key=${this.activationKey}">link</a> to activate your new account.</p></div><div><h1>Hello developer!</h1><p>Feel free to change this template ;).</p></div>`
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })

    return next()
  } catch (error) {
    return next(error)
  }
})

userSchema.method({
  transform () {
    const transformed = {}
    const fields = ['id', 'name', 'email', 'createdAt', 'role']

    fields.forEach((field) => {
      transformed[field] = this[field]
    })

    return transformed
  },

  passwordMatches (password) {
    return bcrypt.compareSync(password, this.password)
  }
})

userSchema.statics = {

  checkDuplicateEmailError,

  async findAndGenerateToken (payload) {
    const { email, password } = payload
    if (!email) throw new APIError('Email must be provided for login')

    const user = await this.findOne({ email }).exec()
    if (!user) throw new APIError(`No user associated with ${email}`, httpStatus.NOT_FOUND)

    const passwordOK = await user.passwordMatches(password)

    if (!passwordOK) throw new APIError(`Password mismatch`, httpStatus.UNAUTHORIZED)

    if (!user.active) throw new APIError(`User not activated`, httpStatus.UNAUTHORIZED)

    return user
  }
}

module.exports = mongoose.model('User', userSchema)

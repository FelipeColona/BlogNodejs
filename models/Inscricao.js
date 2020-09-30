const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Inscricao = new Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    verificado: {
        type: Number,
        default: 0
    },
    data: {
        type: Date,
        default: Date.now()
    },
})


mongoose.model('inscricoes', Inscricao)
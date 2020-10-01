const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
require('../models/Usuario')
const Usuario = mongoose.model('usuarios')
const bcrypt = require('bcryptjs')
const passport = require('passport')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')

router.get('/registro', (req, res) => {
    if(req.isAuthenticated()){
        res.render('usuarios/registro', {eAdmin: req.user.eAdmin, nome: req.user.nome})
    }else{
        res.render('usuarios/registro')
    }

})

router.post('/registro', (req, res) => {
    let erros = []

    if (!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null) {
        erros.push({ texto: 'Nome Inválido' })
    }

    if (!req.body.senha || typeof req.body.senha === undefined || req.body.senha === null) {
        erros.push({ texto: 'Senha Inválido' })
    }

    if (req.body.nome.length > 25) {
        erros.push({ texto: 'Nome Excedeu o Tamanho Limite' })
    }

    if (req.body.senha.length > 25) {
        erros.push({ texto: 'Senha Excedeu o Tamanho Limite' })
    }

    if (req.body.senha.length < 4) {
        erros.push({ texto: 'Senha Muito Curta' })
    }

    if(req.body.senha !== req.body.senha2){
        erros.push({ texto: 'Senhas Não Coincidem' })
    }

    if (erros.length > 0) {
        if(req.isAuthenticated()){
            res.render('usuarios/registro', { erros: erros, eAdmin: req.user.eAdmin, nome: req.user.nome })
        }else{
            res.render('usuarios/registro')
        }
    }else{
        const novoUsuario = new Usuario({
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha
        })

        bcrypt.genSalt(10, (erro, salt) => {
            bcrypt.hash(novoUsuario.senha, salt, (erro, hash) => {
                if(erro){
                    req.flash('error_msg', 'Houve um erro durante o cadastro')
                    res.redirect('/')
                }else{
                    novoUsuario.senha = hash

                    novoUsuario.save().then( () => {
                        req.flash('success_msg', 'Usuário criado com sucesso!')
                        res.redirect('/')
                    }).catch( (err) => {
                            if (err.name === 'MongoError' && err.code === 11000) {
                              // Duplicate user
                                req.flash('error_msg', `Esse email já está cadastrado`)
                                res.redirect('/usuarios/registro')
                            }                      
                            // Some other error
                            req.flash('error_msg', `Houve um erro ao salvar o usuário`)
                            res.redirect('/usuarios/registro')
                    })
                }
            })
        })
    }
})

router.get('/login', (req, res) => {
    if(req.isAuthenticated()){
        res.render('usuarios/login', {eAdmin: req.user.eAdmin, nome: req.user.nome})
    }else{
        res.render('usuarios/login')
    }
})

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/usuarios/login',
        failureFlash: true
    })(req, res, next)
})

router.get('/senha', (req, res) => {
    if(req.isAuthenticated()){
        res.render('usuarios/senha', {eAdmin: req.user.eAdmin, nome: req.user.nome})
    }else{
        res.render('usuarios/senha')
    }
})

router.post('/emailsenha', (req, res) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })

    let novaInscricao = {
        email: `${req.body.email}`
    }

    
    jwt.sign(
        {
            user: `${novaInscricao.email}`
        },
        process.env.SECRET,
        {
            expiresIn: 300
        },
        (err, emailToken) => {
            const url = `http://localhost:8081/usuarios/recuperacaosenha/${emailToken}`

            transporter.sendMail({
                to: novaInscricao.email,
                subject: 'Recuperação de Senha',
                html: `Por favor clique nesse botão para recuperar sua senha: 
                        <a href='${url}'>
                        <button>
                        Confirmar Email
                        </button>
                        </a>`
            }) 
        }
    )

    res.redirect('/usuarios/login')
})

router.get('/recuperacaosenha/:email', (req, res) => {
    jwt.verify(req.params.email, process.env.SECRET, (err, decoded) => {
        res.render('usuarios/recuperacaosenha', {email: decoded.user})
    })
})

router.post('/senhabd', (req, res) => {

    let erros = []

    if (!req.body.Novasenha || typeof req.body.Novasenha === undefined || req.body.Novasenha === null) {
        erros.push({ texto: 'Senha Inválida' })
    }
    
    if (req.body.Novasenha.length > 25) {
        erros.push({ texto: 'Senha Excedeu o Tamanho Limite' })
    }

    if (req.body.Novasenha.length < 4) {
        erros.push({ texto: 'Senha Muito Curta' })
    }

    if (erros.length > 0) { 
        erros.forEach( (obj) => {
            req.flash('error_msg', ` ${obj.texto}`)
        })
        res.redirect(req.get('referer'))
    }else{

    bcrypt.genSalt(10, (erro, salt) => {
        bcrypt.hash(req.body.Novasenha, salt, (erro, hash) => {
            if(erro){
                req.flash('error_msg', 'Houve um erro durante o cadastro')
                res.redirect('/')
            }else{
                Usuario.updateOne({email: `${req.body.email}`}, {$set: {senha: hash}}).then( () => {
                    res.redirect('/usuarios/login')
                }).catch( (err) => {
                    console.log(err)
                })
            }
        })
    })
    }
})

module.exports = router
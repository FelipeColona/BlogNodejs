const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const { cachedDataVersionTag } = require('v8')
require('../models/Categoria')
const Categoria = mongoose.model('categorias')
require('../models/Postagem')
const Postagem = mongoose.model('postagens')
require('../models/Inscricao')
const Inscricao = mongoose.model('inscricoes')
require('../models/Usuario')
const Usuario = mongoose.model('usuarios')
const {eAdmin} = require('../helpers/eAdmin') 
const { decodeBase64 } = require('bcryptjs')

require('dotenv').config()

router.get('/', eAdmin, (req, res) => {
    res.render('admin/index', {eAdmin: 1, nome: req.user.nome})
})

router.get('/estatisticas', eAdmin, (req, res) => {
    let Nusuarios;
    let Npostagens;
    let Ncategorias;
    let Ninscritos;
    let Ncomentarios = 0;
    Usuario.countDocuments().then( (c) => {
        Nusuarios = c

        Postagem.countDocuments().then( (c) => {
            Npostagens = c

            Categoria.countDocuments().then( (c) => {
            Ncategorias = c

                Inscricao.countDocuments().then( (c) => {
                    Ninscritos = c

                    Postagem.find().then( (a) => {
                        a.forEach( (b) => {
                            Ncomentarios = b.comentarios.length + Ncomentarios
                        })

                        res.render('admin/estatisticas', {eAdmin: 1, nome: req.user.nome, Nusuarios: Nusuarios, Npostagens: Npostagens, Ncategorias: Ncategorias, Ninscritos: Ninscritos, Ncomentarios: Ncomentarios})
                    })
                })    
            })
        })
    })
})

router.get('/categorias', eAdmin, (req, res) => {
    Categoria.find().sort({ date: 'desc' }).then((categorias) => {
        res.render('admin/categorias', { categorias: categorias.map(categorias => categorias.toJSON()), eAdmin: 1, nome: req.user.nome})
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao listar as categorias ')
    })
})

router.get('/categorias/edit/:id', eAdmin, (req, res) => {
    Categoria.findOne({ _id: req.params.id }).lean().then((categoria) => {
        res.render('admin/editcategorias', { categoria: categoria,  eAdmin: 1, nome: req.user.nome })
    }).catch((err) => {
        req.flash('error_msg', 'Essa categoria não existe')
        res.redirect('/admin/categorias')
    })
})

router.post('/categorias/edit', eAdmin, (req, res) => {

    let erros = []

    if (!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null) {
        erros.push({ texto: 'Nome Inválido' })
    }

    if (!req.body.slug || typeof req.body.slug === undefined || req.body.slug === null) {
        erros.push({ texto: 'Slug Inválido' })
    }

    if (req.body.nome.length > 25) {
        erros.push({ texto: 'Nome Excedeu o Tamanho Limite' })
    }

    if (req.body.slug.length > 25) {
        erros.push({ texto: 'Slug Excedeu o Tamanho Limite' })
    }

    if (erros.length > 0) {
        res.redirect('/admin/categorias')
    } else {
        Categoria.findOne({ _id: req.body.id }).then((categoria) => {

            categoria.nome = req.body.nome
            categoria.slug = `${req.body.slug}`.toLocaleLowerCase().replace(/\s/g, '-')

            categoria.save().then(() => {
                req.flash('success_msg', 'Categoria editada com sucesso!')
                res.redirect('/admin/categorias')
            }).catch((err) => {
                req.flash('error_msg', 'Houve um erro interno ao salvar a edição da categoria')
                res.redirect('/admin/categorias')
            })
        }).catch((err) => {
            req.flash('error_msg', 'Houve um erro ao editar a categoria')
            res.redirect('/admin/categorias')
        })
    }
})

router.post('/categorias/delete', eAdmin, (req, res) => {
    Categoria.deleteOne({ _id: req.body.id }).then((categoria) => {
        req.flash('success_msg', 'Categoria deletada com sucesso!')
        res.redirect('/admin/categorias')
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao deletar a categoria')
        res.redirect('/admin/categorias')
    })
})

router.get('/categorias/add', eAdmin, (req, res) => {
    res.render('admin/addcategorias', {eAdmin: 1, nome: req.user.nome})
})

router.post('/categorias/nova', eAdmin, (req, res) => {

    let erros = []

    if (!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null) {
        erros.push({ texto: 'Nome Inválido' })
    }

    if (!req.body.slug || typeof req.body.slug === undefined || req.body.slug === null) {
        erros.push({ texto: 'Slug Inválido' })
    }

    if (req.body.nome.length > 25) {
        erros.push({ texto: 'Nome Excedeu o Tamanho Limite' })
    }

    if (req.body.slug.length > 25) {
        erros.push({ texto: 'Slug Excedeu o Tamanho Limite' })
    }

    if (erros.length > 0) {
        res.render('admin/addcategorias', { erros: erros, eAdmin: 1, nome: req.user.nome })
    } else {
        let lowerSlug = `${req.body.slug}`.toLocaleLowerCase()

        const novaCategoria = {
            nome: req.body.nome,
            slug: `${req.body.slug}`.toLocaleLowerCase().replace(/\s/g, '-')
        }
        new Categoria(novaCategoria).save().then(() => {
            req.flash('success_msg', 'Categoria criada com sucesso')
            res.redirect('/admin/categorias')
        }).catch((err) => {
            req.flash('error_msg', 'Erro ao salvar categoria: ' + err)
            res.redirect('/admin')
        })
    }
})

router.get('/postagens', eAdmin, (req, res) => {
    Postagem.find().populate('categoria').sort({ data: 'desc' }).then((postagens) => {
        res.render('admin/postagens', { postagens: postagens.map(postagens => postagens.toJSON()), eAdmin: 1, nome: req.user.nome })
    }).catch((err) => {

    })
})

router.get('/postagens/add', eAdmin, (req, res) => {
    Categoria.find().lean().then((categorias) => {
        res.render('admin/addpostagem', { categorias: categorias, eAdmin: 1, nome: req.user.nome })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao carregar o formulário')
        res.redirect('/admin')
    })
})




router.post('/postagens/nova', eAdmin, (req, res) => {
    let erros = []

    if (req.body.categoria == '0') {
        erros.push({ texto: 'Postagem inválida, registre uma postagem' })
    }
    if (erros.length > 0) {
        res.render('admin/addpostagens', { erros: erros, eAdmin: 1, nome: req.user.nome })
    } else {
        const novaPostagem = {
            titulo: req.body.titulo,
            descricao: req.body.descricao,
            conteudo: req.body.conteudo,
            categoria: req.body.categoria,
            slug: `${req.body.slug}`.toLocaleLowerCase().replace(/\s/g, '-') 
        }

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: `${req.body.emailRemetente}`,
                pass: `${req.body.senha}`
            }
        })

        console.log(transporter)

/* */

        let inscritos = [];

        Inscricao.find({verificado: 1}).then((inscricao) => {
            inscricao.forEach((item) => {
                inscritos.push(item.email)
            })


            transporter.sendMail({
                from: `${req.body.nomeEmail} <${req.body.emailRemetente}>`,
                to: inscritos,
                subject: `${req.body.assunto}`,
                text: `${req.body.texto}`,
            }).then((message) => {
                console.log(message)
            }).catch((err) => {
                console.log(err)
            })
        })

        console.log(novaPostagem)

        new Postagem(novaPostagem).save().then(() => {
            req.flash('success_msg', 'Postagem criada com sucesso!')
            res.redirect('/admin/postagens')
        }).catch((err) => {
            req.flash('error_msg', 'Houve um erro ao cadastrar postagem')
            res.redirect('/admin/postagens')
        })
    }
})

router.get('/postagens/edit/:id', eAdmin, (req, res) => {
    Postagem.findOne({_id: req.params.id}).lean().then( (postagem) => {
      
        Categoria.find().lean().then( (categorias) => {
            res.render('admin/editpostagens', {categorias: categorias, postagem: postagem, eAdmin: 1, nome: req.user.nome})
        }).catch( (err) => {
          req.flash('error_msg', 'Houve um erro ao listar as categorias')
          res.redirect('/admin/postagens')
        })
    }).catch( (err) => {
        req.flash('error_msg', 'Houve um erro ao carregar o formulário de edição')
        res.redirect('/admin/postagens')
    })
})


router.post('/postagem/edit', eAdmin, (req, res) => {
    Postagem.findOne({_id: req.body.id}).then( (postagem) => {
      postagem.titulo = req.body.titulo
      postagem.slug = req.body.slug
      postagem.descricao = req.body.descricao
      postagem.conteudo = req.body.conteudo
      postagem.categoria = req.body.categoria

      postagem.save().then( () => {
        req.flash('success_msg', 'Postagem editada com sucesso')
        res.redirect('/admin/postagens')
      }).catch( (err) => {
      req.flash('error_msg', 'Erro interno')
      res.redirect('/admin/postagens')
      })
    }).catch( (err) => {
      req.flash('error_msg', 'Houve um erro ao salvar a edição')
      res.redirect('/admin/postagens')
    })
})

router.post('/postagem/delete', eAdmin, (req, res) => {
    Postagem.deleteOne({_id: req.body.id}).then( () => {
        req.flash('success_msg', 'Postagem deletada com sucesso!')
        res.redirect('/admin/postagens')
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao deletar a postagem')
        res.redirect('/admin/postagens')
    })
})

router.get('/usuarios', eAdmin, (req, res) => {
    Usuario.find().sort({data: 'desc'}).limit(10).lean().then( (usuarios) => {
        res.render('admin/usuarios', {eAdmin: 1, nome: req.user.nome, usuarios: usuarios})
    })
})

router.post('/usuarios/procurar', eAdmin, (req, res) => {
    if(!req.body.email){
        res.redirect('/admin/usuarios')
    }
    Usuario.findOne({email: req.body.email}).lean().then( (usuario) => {
        if(usuario === null){
            req.flash('error_msg', 'Usuario não encontrado')
            res.redirect('/admin/usuarios')
        }else{
            res.render('admin/usuario', {eAdmin: 1, nome: req.user.nome, usuario: usuario})
        }
    })
})

router.get('/usuarios/hierarquia/:id', eAdmin, (req, res) => {
    Usuario.findOne({_id: req.params.id}).then( (usuario) => {
        if(usuario.eAdmin === 0){
            usuario.eAdmin = 1
            usuario.save();
            res.redirect('/admin/usuarios')
        }else{
            usuario.eAdmin = 0
            usuario.save();
            res.redirect('/admin/usuarios')
        }

    })
})

router.get('/usuarios/deletar/:id', eAdmin, (req, res) => {
    Usuario.deleteOne({_id: req.params.id}).then( () => {
        res.redirect('/admin/usuarios')
    })
})

/* ?idpostagem&idcomentario */

router.get('/postagem/comentario/deletar', eAdmin, (req, res) => {
    Postagem.findOneAndUpdate(
        {"_id" : req.query.idpostagem },
        {$pull: { comentarios: { "_id" : req.query.idcomentario}}},
        {$multi: true}
    ).then( () => {
        res.redirect(req.get('referer'))
    }).catch( (err) => {
        console.log('Didnt wirked...')
    })

})

module.exports = router


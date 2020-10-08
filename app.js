// Carregando Módulos
    const express = require('express')
    const handlebars = require('express-handlebars')
    const bodyParser = require('body-parser')
    const app = express()
    const admin = require('./routes/admin')
    const path = require('path')
    const mongoose = require('mongoose')
    const session = require('express-session')
    const flash = require('connect-flash')
    require('./models/Postagem')
    const Postagem= mongoose.model('postagens')
    require('./models/Categoria')
    const Categoria = mongoose.model('categorias')
    require('./models/Inscricao')
    const Inscricao = mongoose.model('inscricoes')
    require('./models/Usuario')
    const Usuario = mongoose.model('usuarios')
    const usuarios = require('./routes/usuario')
    const nodemailer = require('nodemailer')
    const jwt = require('jsonwebtoken')
    require('dotenv').config()
    const passport = require('passport')
    require('./config/auth')(passport)
    
/* 

*/

// Configs
    // Sessão
        app.use(session({
            secret: 'qualquerCoisa',
            resave: true,
            saveUninitialized: true
        }))

        app.use(passport.initialize())
        app.use(passport.session())
        app.use(flash())
    // Middleware
        app.use( (req, res, next) => {
            res.locals.success_msg = req.flash('success_msg')
            res.locals.error_msg = req.flash('error_msg')
            res.locals.error = req.flash('error')
            res.locals.user = req.user || null
            next()
        })

    // Body Parser
        app.use(bodyParser.urlencoded({extended: true}))
        app.use(bodyParser.json())
    
    // Handlebars
        app.engine('handlebars', handlebars({defaultLayout: 'main'}))
        app.set('view engine', 'handlebars')
        let hbs = handlebars.create({})
        hbs.handlebars.registerHelper('idComparator', function(id1, id2, idPostagem, idComentario) {
            if(id1 == id2){
                return new hbs.handlebars.SafeString(
                    `
                    <form action="/postagem/comentario/deletar" method="post">
                        <input type="hidden" name="idPostagem" value="${idPostagem}" >
                        <input type="hidden" name="idComentario" value="${idComentario}">
                        <button type="submit" class="float-right" style="border: 0; padding: 0; font-size: 100%; font-family: inherit; margin: 0; line-height: 1.15;" ><i class="fas fa-trash-alt" style="color: red;"></i></button>
                    </form>

                    `
                )
            }
          })
        
        hbs.handlebars.registerHelper('idReplies', function(id1, id2, idPostagem, idComentario, indexResposta){
            if(id1 == id2){
                return new hbs.handlebars.SafeString(
                    `
                    <a href="/postagem/comentario/respostas/deletar?idpostagem=${idPostagem}&idcomentario=${idComentario}&indexresposta=${indexResposta}" class="float-right" ><i class="fas fa-trash-alt" style="color: red;"></i></a>

                    `
                )
            }
        })
        

    // Mongoose

        mongoose.Promise = global.Promise;
        mongoose.connect('mongodb://localhost/blog', {
        
            useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true
        
        }).then(() => {
        
            console.log('MongoDB Conectado...')
        
        }).catch((err) => {
        
            console.log('Houve um erro ao se conectar ao MongoDB: ' + err)
        
        })
        
    // Public
        app.use(express.static(path.join(__dirname, 'public')))
        

// Rotas
    
    app.get('/', (req, res) => {
        if(req.isAuthenticated()){
            Postagem.find().populate('categoria').sort({data: 'desc'}).lean().then( (postagens) => {
                res.render('index', {postagens: postagens, nome: req.user.nome, eAdmin: req.user.eAdmin})
            }).catch( (err) => {
              req.flash('error_msg', 'Houve um erro interno')
              res.redirect('/404')
            })
        }else{
            Postagem.find().populate('categoria').sort({data: 'desc'}).lean().then( (postagens) => {
                res.render('index', {postagens: postagens})
            }).catch( (err) => {
              req.flash('error_msg', 'Houve um erro interno')
              res.redirect('/404')
            })
        }
    })    

    app.get('/postagem/:slug', (req, res) => {
        Postagem.aggregate([
            {
                $match: { "titulo": `${req.params.slug}` }
            },
            {
                $unwind: '$comentarios'
            },
            {
                $sort: {
                    'comentarios.likes': -1 
                }
            }
        ]
        ).exec( (err, response) => {
            if(req.isAuthenticated()){
                Postagem.findOne({slug: req.params.slug}).lean().then( (postagem) => {
                    if(postagem){
                        res.render('postagem/index', {postagem: postagem, usuario: req.user.nome, response: response, eAdmin: req.user.eAdmin, nome: req.user.nome, tamanho: postagem.comentarios.length, idUsuario: req.user._id,})
                    }else{
                      req.flash('error_msg', 'Esta postagem não existe')
                      res.redirect('/')
                    }
                  }).catch( (err) => {
                    req.flash('error_msg', `Houve um erro interno: ${err}`)
                    res.redirect('/')
                  })
            }else{
                Postagem.findOne({slug: req.params.slug}).lean().then( (postagem) => {
                    if(postagem){
                      res.render('postagem/index', {postagem: postagem, response: response, tamanho: postagem.comentarios.length})
                    }else{
                      req.flash('error_msg', 'Esta postagem não existe')
                      res.redirect('/')
                    }
                  }).catch( (err) => {
                    req.flash('error_msg', 'Houve um erro interno')
                    res.redirect('/')
                  })
            }
        })
    })

    app.post('/postagem/comentario', (req, res) => {
        Postagem.findOne({_id: req.body.id}).then( (postagem) => {
            postagem.comentarios.push({usuario: req.user.nome, idusuario: req.user._id, texto: `${req.body.texto}`})
            postagem.save()
        })
        res.redirect(`/postagem/${req.body.slug}`)
    })


    app.post('/postagem/comentario/deletar', (req, res) => {
        Postagem.findOneAndUpdate(
            {"_id" : req.body.idPostagem },
            {$pull: { comentarios: { "_id" : req.body.idComentario}}},
            {$multi: true}
        ).then( () => {
            res.redirect(req.get('referer'))
        }).catch( (err) => {
            req.flash('error_msg', 'Houve um erro ao deletar comentários')
            res.redirect(req.get('referer'))
        })
    })


    app.post('/postagem/comentario/responder', (req, res) => {
        if(req.body.textoResposta){
            let respostaDados = {
                usuario: req.body.nomeUsuario,
                idusuario: req.body.idUsuario,
                texto: req.body.textoResposta,
            }

            Postagem.findOne({_id: req.body.idPostagem}).then( (postagem) => {
                const postagemEncontrada = postagem.comentarios.find( (comentario) => {
                    return comentario._id == req.body.idComentario
                })
                postagemEncontrada.replies.push(respostaDados)
                postagem.save()
                res.redirect(req.get('referer'))
            })
        }else{
            req.flash('error_msg', 'Texto inválido')
            res.redirect(req.get('referer'))
        }
    })

    app.get('/postagem/comentario/respostas/deletar', (req, res) => {
        Postagem.findOne({_id: req.query.idpostagem}).then( (postagem) => {
            const indexresposta = parseInt(req.query.indexresposta)
            postagem.comentarios.forEach( (comentario) => {
                if(comentario._id == req.query.idcomentario){
                    if(comentario.replies[indexresposta].idusuario == req.user._id){
                        comentario.replies.splice(indexresposta, 1)
                        postagem.save()
                        res.redirect(req.get('referer'))
                    }else{
                        req.flash('error_msg', 'ERROR')
                        res.redirect('/')
                    }
                }
            })
        })
    })


    app.post('/postagem/like', (req, res) => {
        if(req.isAuthenticated()){
            Postagem.findOne({_id: req.body.idPostagem}).then( (postagem) => {
                postagem.comentarios.map( (obj) => {
                    if(obj._id == req.body.idComentario){
                        if(obj.likes == undefined){
                            obj.usuarios.push(`${req.user._id}`)
                            obj.likes = 1
                            postagem.save();
                            res.redirect(`/postagem/${postagem.slug}`)
                        }else{
                            const found = obj.usuarios.find(usuarioId => usuarioId == req.user.id)
                            const index = obj.usuarios.indexOf(req.user._id)
                            if(found){
                                obj.usuarios.splice(index, 1)
                                obj.likes = obj.likes - 1
                                postagem.save();
                                res.redirect(`/postagem/${postagem.slug}`)
                            }else{
                                obj.usuarios.push(`${req.user._id}`)
                                obj.likes = obj.likes + 1
                                postagem.save();
                                res.redirect(`/postagem/${postagem.slug}`)
                            }
    
                        }
                    }
                })
            })
        }else{
            req.flash('error_msg', 'Faça Login para dar like')
            res.redirect('/')
        }
    })


    app.post('/newsletter', (req, res) => {

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
    
        let novaInscricao = {
            email: `${req.body.newsletter}`
        }
    
        new Inscricao(novaInscricao).save().then(() => {
    
                jwt.sign(
                {
                    user: `${novaInscricao.email}`
                },
                process.env.SECRET,
                {
                    expiresIn: 300
                },
                (err, emailToken) => {
                    const url = `http://localhost:8081/confirmacao/${emailToken}`
    
                    transporter.sendMail({
                        to: novaInscricao.email,
                        subject: 'Confirmação de Email',
                        html: `Por favor clique nesse botão para confirmar seu email: 
                                <a href='${url}'>
                                <button>
                                Confirmar Email
                                </button>
                                </a>`
                    }) 
                }
            )
    
            req.flash('success_msg', 'Inscrição efetuada com sucesso')
            res.redirect('/')
        }).catch((err) => {
    
            Inscricao.findOne({email: `${novaInscricao.email}`}).lean().then( (usuario) => {
    
                if( usuario.verificado === 0){
                    jwt.sign(
                        {
                            user: `${novaInscricao.email}`
                        },
                        process.env.SECRET,
                        {
                            expiresIn: 300
                        },
                        (err, emailToken) => {
    
                            let transporter2 = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: process.env.EMAIL_USER,
                                    pass: process.env.EMAIL_PASS
                                }
                            })
    
                            const url = `http://localhost:8081/confirmacao/${emailToken}`
            
                            transporter2.sendMail({
                                to: novaInscricao.email,
                                subject: 'Confirmação de Email',
                                html: `Por favor clique nesse botão para confirmar seu email: 
                                <a href='${url}'>
                                <button>
                                Confirmar Email
                                </button>
                                </a>`
                            })
                        }
                    )
                    req.flash('success_msg', 'Email enviado')
                    res.redirect('/')
                }
            }).catch( (err) => {
                req.flash('error_msg', 'Erro ao se cadastrar: ' + err)
                res.redirect('/')
            })
        })
    })




    app.get('/confirmacao/:token', (req, res) => {
        jwt.verify(req.params.token, process.env.SECRET, (err, decoded) => {
            Inscricao.findOneAndUpdate({email: `${decoded.user}`}, {verificado: 1}).then( () => {
                res.render('admin/confirmacao')
            }).catch( (err) => {
              console.log(`Error: ${err}`)
            })
        })
    })



    app.get('/categorias', (req, res) => {
        if(req.isAuthenticated()){
            Categoria.find().lean().then( (categorias) => {
                res.render('categorias/index', {categorias: categorias, eAdmin: req.user.eAdmin, nome: req.user.nome})
            
            }).catch( (err) => {
                req.flash('error_msg', 'Houve um erro interno ao listar categorias')
                res.redirect('/')
            })
        }else{
            Categoria.find().lean().then( (categorias) => {
                res.render('categorias/index', {categorias: categorias})
                
            }).catch( (err) => {
                req.flash('error_msg', 'Houve um erro interno ao listar categorias')
                res.redirect('/')
            })
        }
    })

    app.get('/categorias/:slug',(req, res) => {
        if(req.isAuthenticated()){
            Categoria.findOne({slug: req.params.slug}).lean().then( (categoria) => {
                if(categoria){
                    Postagem.find({categoria: categoria._id}).lean().then( (postagens) => {
                        res.render('categorias/postagens', {postagens: postagens, categoria: categoria, eAdmin: req.user.eAdmin, nome: req.user.nome})     
                    }).catch( (err) => {
                        req.flash('error_msg', `Houve um erro ao listar postagens: ${err}`)
                        res.redirect('/')
                    })
                }else{
                    req.flash('error_msg', 'Essa categoria não existe')
                    res.redirect('/')
                }
            }).catch( (err) => {
                req.flash('error_msg', 'Houve um erro interno ao carregar a página dessa categoria')
                res.redirect('/')
            })
        }else{
            Categoria.findOne({slug: req.params.slug}).lean().then( (categoria) => {
                if(categoria){
                    Postagem.find({categoria: categoria._id}).lean().then( (postagens) => {
                        res.render('categorias/postagens', {postagens: postagens, categoria: categoria})     
                    }).catch( (err) => {
                        req.flash('error_msg', `Houve um erro ao listar postagens: ${err}`)
                        res.redirect('/')
                    })
                }else{
                    req.flash('error_msg', 'Essa categoria não existe')
                    res.redirect('/')
                }
            }).catch( (err) => {
                req.flash('error_msg', 'Houve um erro interno ao carregar a página dessa categoria')
                res.redirect('/')
            })
        }
    })
 

    app.get('/404', (req, res) => {
        res.send('Erro 404!')
    })

    app.get('/logout', (req, res) => {
        if(req.isAuthenticated()){
            req.logout()
            req.flash('success_msg', 'Deslogado com sucesso!')
            res.redirect('/')
        }else{
            req.flash('error_msg', 'Error')
            res.redirect('/')
        }
    })

    app.use('/admin', admin)
    app.use('/usuarios', usuarios)
// Outros
    const PORT = 8081
    app.listen(PORT, () => {
        console.log('Server rodando no link: localhost:8081')
    })  


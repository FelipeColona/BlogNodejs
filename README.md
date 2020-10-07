# BlogNodejs

## Resumo do Projeto
  Iniciei ele por conta de um [curso](https://www.youtube.com/watch?v=LLqq6FemMNQ&list=PLJ_KhUnlXUPtbtLwaxxUxHqvcNQndmI4B) de Nodejs no Youtube, sendo ele o último projeto prático, e resolvi implementar algumas novas features como: newsletter, painel administrativo, sistema de "Esqueceu a senha?", aba de comentários, respostas aos comentários, sistema de likes e verificação de email utilizando JWT.    

## Principais Tecnologias Utilizadas:
  - Nodejs
  - Mongodb
  - Express
  - Handlebars
  - Bootstrap
  
## Arquivos Principais:
  - [app.js](https://github.com/FelipeColona/BlogNodejs/blob/master/app.js)
     >Rotas principais da aplicação
  - [admin.js](https://github.com/FelipeColona/BlogNodejs/blob/master/routes/admin.js)
     >Responsável pelas rotas exclusivas do administrador
  - [usuario.js](https://github.com/FelipeColona/BlogNodejs/blob/master/routes/usuario.js)
     >Controla principalmente login e registro de usuários
     
## Models do Banco de dados:
  - [Categoria.js](https://github.com/FelipeColona/BlogNodejs/blob/master/models/Categoria.js)
     >Armazena as informações das categorias das postagens
  - [Inscricao.js](https://github.com/FelipeColona/BlogNodejs/blob/master/models/Inscricao.js)
     >Guarda email e data de cadastro dos emails na newsletter, além de controlar a verificação
  - [Postagem.js](https://github.com/FelipeColona/BlogNodejs/blob/master/models/Postagem.js)
     >Salva os dados das postagens como: título, descrição, conteudo, data, categoria pertencente, informações dos comentarios e respostas
  - [Usuario.js](https://github.com/FelipeColona/BlogNodejs/blob/master/models/Usuario.js)
     >Encarregado dos dados dos usuários: nome, email, hash da senha, data de registro, e hierarquia

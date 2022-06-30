//Llamando modulos para el funcionamiento del servidor
const express = require('express');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes')
const comicRoutes = require('./routes/comicRoutes')
const flash = require('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const app = express();
const initializePassport = require('./lib/passportAuth');
const {Sequelize, DataTypes, Op} = require('sequelize');
const connectDatabase = require('./db')();
const models = require('./models/models');
const sequelize = require('./lib/sequelizeInit');
const helpers = require('./lib/helpers')
const controller = require('./controllers/comicController');
const  {isLoggedIn, isNotLoggedIn} = require('./lib/checkLog');


//Iniciando a Passport el encargado de la session del usuario
initializePassport(
    passport,
    getUserByEmail = async (email) => { return models.UserEntry.findAll( { where: { email: email} } ) },
    getUserbyId = async(id) => {  return models.UserEntry.findAll( { where: { id: id} } ) }
);
//Configuracion del servidor
app.listen(3000);
app.use(cookieParser('tesisSession'));
app.use(session({
    secret:'tesisSession',
    resave: false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.set('view engine','ejs');
app.use(express.urlencoded({extended: false}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(__dirname+'/public'));

//Variables Globales
app.use(async (req,res,next) => {
    app.locals.user = await req.user
    passport
    next();
})

//Enrutamiento principal
app.get('/', async (req, res) => {
    let user; if (await req.user) {
        req.user.then( e => {user = e[0]} );
    }
    if (user) {
        user= user[0].dataValues
    }

    if(req.session.returnTo){
        req.session.returnTo = ""
    }
    const users = await models.UserEntry.findAll();

    let newComics = await models.ComicEntry.findAll({
        order:[
            ['createdAt','DESC'],
        ]
    })
    for (let comic of newComics) {
        comic = comic.dataValues
    }

    let updatedComics = await models.ComicEntry.findAll({
        order:[
            ['updatedAt','DESC'],
        ]
    })
    for (let comic of updatedComics) {
        comic = comic.dataValues
    }

    let Liked = await models.likeEntry.findAll({
        where: {
            createdAt: {
              [Op.lt]: new Date(),
              [Op.gt]: new Date(new Date() - 24 * 60 * 60 * 7000)
            }
          },
    })


    let comicsLiked = [];
    for (let like of Liked) {
        comicsLiked.push(like.dataValues.comic_id);
    }

    comicsLiked = [...new Set(comicsLiked)];
    //console.log('comicsLiked :>> ', comicsLiked);

    let likedWeek = [];

    for (let i = 0; i < comicsLiked.length; i++) {
        let hott = await models.likeEntry.count({
            where: {
                comic_id: comicsLiked[i],
                createdAt: {
                  [Op.lt]: new Date(),
                  [Op.gt]: new Date(new Date() - 24 * 60 * 60 * 7000)
                }
              },
        })
        hottest = {comic_id: comicsLiked[i], likeCount: hott}
        likedWeek.push(hottest);
    }

    likedWeek.sort((a, b) => parseFloat(a.likeCount) - parseFloat(b.likeCount));
    likedWeek = likedWeek.reverse().slice(0,6);

    let rng = (min, max) =>{
        return Math.floor(Math.random() * (max - min) + min);
    }

    let cats = ["acción","comedia","misterio","aventura","drama","terror","fantasia","romance","vida-escolar","vida-cotidiana","ciencia-ficcion","deportes","maduro","crimen","psicologico","artes-marciales"]

    let rngTags=[ cats[rng(0,cats.length)], cats[rng(0,cats.length)] ];

    let randomTag1 = await models.ComicEntry.findAll({
        where:{
            comicCategories: {
                [Op.like]: '%' + rngTags[0] + '%'
            },
        }
    })
    randomTag1 = randomTag1.slice(0,6);

    let randomTag2 = await models.ComicEntry.findAll({
        where:{
            comicCategories: {
                [Op.like]: '%' + rngTags[1] + '%'
            },
        }
    })
    randomTag2 = randomTag2.slice(0,6);

    for (let i = 0; i < likedWeek.length; i++) {
        if (likedWeek[i]) {
            likedWeek[i] = await models.ComicEntry.findByPk(likedWeek[i].comic_id);
            likedWeek[i] = likedWeek[i].dataValues
        }

        if (randomTag1[i]) {
            randomTag1[i] = randomTag1[i].dataValues
        }
        if (randomTag2[i]) {
            randomTag2[i] = randomTag2[i].dataValues
        }
    }


    res.render('index', {title: 'Pagina Principal',rngTags:rngTags, randomTag2:randomTag2,randomTag1:randomTag1, likedWeek:likedWeek, updatedComics:updatedComics, newComics:newComics, users: users, user: app.locals.user ,success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})
app.get('/about',async (req, res) => {
    let user; if (await req.user) {
        req.user.then( e => {user = e[0]} );
        user = user.dataValues;
        console.log(user);
    }
    res.render('about',{title: 'Pagina de Informacion', success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})
app.get('/index',(req, res) => {
    res.redirect('/');
})
app.get('/login', async (req, res) => {
    res.render('./user/login', {title: 'Acesso', success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})
app.post('/login', passport.authenticate('local'), async (req, res) =>{
    res.redirect(req.session.returnTo || '/');
    delete req.session.returnTo;
})
app.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/')
})
app.get('/register',(req, res) => {
    res.render('./user/register', {title: 'Registro', success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})
app.post('/register', async (req, res, next) =>{
    try{

        //Se cambian los espacios en blanco del nombre para evitar complicaciones
        let username = req.body.username;
        if(username.includes(" ")){
            usernamer = username.replace(" ","-")
        }

        //Primero se revisa si no estan registrados el nombre de usuario o el correo
        const isUsername = await models.UserEntry.findAll({
            where:{
                username: username
            }
        })
        const isEmail = await models.UserEntry.findAll({
            where:{
                email: req.body.email
            }
        })

        if(isUsername.length > 0 || isEmail.length > 0){
            req.flash('error','El Usuario o email ya ha sido registrado')
            res.redirect('back');
            return
        }

        //Encriptando la contraseña del usuario
        const Password = await helpers.encryptPassword(req.body.password);

        //Aqui se crea y se guarda en la bdd el usuario
        let newUser = await models.UserEntry.create({username: username, email: req.body.email, password: Password,profilePicPath:"/defaultUserPic.png"})

        next();

    }catch(err){

        //Si falla devuelve al registro
        console.log(err);
        req.flash('error','Algo sucedio mientras se creaba tu usuario, intentalo de nuevo por favor')
        res.redirect('back');

    }
},
async (req,res) => {
    try {
        //Se crean las configuraciones por defecto del usuario y los comics
        console.log('req.body.username :>> ', req.body.username);
        let user = await models.UserEntry.findOne({
            where: {
                username:req.body.username
            }
        })
        user = user.dataValues

        let pageTurn = models.SettingsEntry.create({user_id:user.id,setting:"pageTurnDirection",value:"lr"})
        let imgScalling = models.SettingsEntry.create({user_id:user.id,setting:"imgScalling",value:"screen"})
        let jumpOnPageTurn = models.SettingsEntry.create({user_id:user.id,setting:"jumpOnPageTurn",value:"nojump"})
        let colorFilter = models.SettingsEntry.create({user_id:user.id,setting:"colorFilter",value:"#ffae00"})
        let filterOnOff = models.SettingsEntry.create({user_id:user.id,setting:"filterOnOff",value:"off"})
        let imgDisplay = models.SettingsEntry.create({user_id:user.id,setting:"imgDisplay",value:"1"})
        let focusMode = models.SettingsEntry.create({user_id:user.id,setting:"focusMode",value:"off"})
        let theme = models.SettingsEntry.create({user_id:user.id,setting:"theme",value:"light"})

        req.flash('success','Usuario registrado exitosamente');
        res.redirect('/login');

    } catch (err) {
        console.log(err);
        req.flash('error','Algo sucedio mientras se creaba tu usuario, intentalo de nuevo por favor')
        res.redirect('back');
    }
})
app.get('/search',async (req, res) => {

    let user; if (await req.user) {
        req.user.then( e => {user = e[0]} );
        user = user.dataValues;
        console.log(user);
    }

    let comics = await models.ComicEntry.findAll();
    if (comics.length > 0) {
        for (let comic of comics) {
            comic = comic.dataValues;
        }
    }
    res.render('comic/search', {title: 'Buscar Comic', user:user, comics: comics,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
})
app.post('/search', async (req, res) => {
    let user; if (await req.user) {
        req.user.then( e => {user = e[0]} );
        user = user.dataValues;
        console.log(user);
    }
    let search;
    let comicName;
    let comicTag;

    if (await req.body.comicSearch && await req.body.cats) {
        comicTag = req.body.cats
        comicName = req.body.comicSearch
        console.log('params: >> ',comicTag,comicName);
        search = await models.ComicEntry.findAll({
            where: {
                comicCategories: {
                    [Op.like]: '%' + comicTag + '%'
                },
                comicName: {
                    [Op.like]: '%' + comicName + '%'
                }
            }
        })

        if (search) {
            count = 0
            for (const comic of search) {
                count++
                console.log(`comic ${count}`,comic.dataValues);
            }
        }
    }

    if (await req.body.cats !== "---" && !await req.body.comicSearch) {
        comicTag = req.body.cats
        console.log(comicTag);
        search = await models.ComicEntry.findAll({
            where: {
                comicCategories: {
                    [Op.like]: '%' + comicTag + '%'
                }
            }
        })

        if (search) {
            count = 0
            for (const comic of search) {
                count++
                console.log(`comic ${count}`,comic.dataValues);
            }
        }
    }

    if (await req.body.comicSearch && await req.body.cats === "---" ) {
        comicName = req.body.comicSearch

        if(comicName.includes(" ")){
            comicName = comicName.split(" ")
            comicName.forEach(async (query) => {
                search = await models.ComicEntry.findAll({
                    where: {
                        comicName: {
                            [Op.like]: '%' + query + '%'
                        }
                    }
                })

                if (search.length>=1) {
                    res.render('comic/search', {title: 'Search Comic', user:user, comics: search ,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
                    return
                }
            });
        }

        search = await models.ComicEntry.findAll({
            where: {
                comicName: {
                    [Op.like]: '%' + comicName + '%'
                }
            }
        })

        if (search) {
            count = 0
            for (const comic of search) {
                count++
                console.log(`comic ${count}`,comic.dataValues);
            }
        }
    }

    if (search.length<1) {
        req.flash('error','No comic found');
        res.redirect('../search')
        return
    }
    res.render('comic/search', {title: 'Search Comic', user:user, comics: search ,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
})
app.get('/read/:comicId', controller.profile_get);
app.get('/read/:comicId/:chapter/:page', controller.read_get);
app.post('/read/:comicId/:chapter/:page', controller.read_post);

//Enrutamiento de procesos de comics
app.use('/comic', comicRoutes)

//Enrutamiento de precesos de  Usuarios
app.use('/user', userRoutes)

//Pagina 404 No Encontrado
app.use((req,res)=>{
    res.status(404).render('404',{title: 'Oops!', success:req.flash('success'), error:req.flash('error'), message:req.flash('message')});
})

/*
subir
actualizar
crear usuario
las opciones
*/
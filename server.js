//! YOU HAVE 3 DAYS TO MAKE A WORKING PROTOTYPE

//*Llamando modulos para el funcionamiento del servidor
const express = require('express');
const morgan = require('morgan');
//const userRoutes = require('./routes/userRoutes')
//const comicRoutes = require('./routes/comicRoutes')
//const globalRoutes = require('./routes/')
const pool = require('./database');
const flash = require('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const app = express();
const initializePassport = require('./lib/passportAuth');
const {Sequelize, DataTypes} = require('sequelize');
const connectDatabase = require('./db')();
const models = require('./models/models');
const sequelize = require('./lib/sequelizeInit');
const helpers = require('./lib/helpers')


//*Iniciando el modulo para
initializePassport(

    passport,

    getUserByEmail = async (email) => {
         await pool.query('USE tesis;');
        return await pool.query('SELECT * FROM users WHERE email = ?',[email])
    },

    getUserbyId = async(id) => {
        await pool.query('USE tesis;')
        return await pool.query('SELECT * FROM users WHERE id = ?',[id])
    }
);

//*Server listener
app.listen(3000);


//*Set up ejs as view engine
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

//*global variables
app.use(async (req,res,next) => {
    app.locals.user = await req.user;
    next();
})

//*Main routing
app.get('/', async (req, res) => {
    await pool.query('USE tesis');
    const users = await pool.query('SELECT * FROM users')
    res.render('index', {tittle: 'Main', users: users, user: await req.user,success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})

app.get('/about',(req, res) => {
    res.render('about',{tittle: 'About Page',success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
})
app.get('/index',(req, res) => {
    res.redirect('/');
})

app.post('/user/login', passport.authenticate('local'),/* {
    successRedirect: ,
    failureRedirect: '/user/login',
    failureFlash: true
}) */function(req, res) {
    res.redirect(req.session.returnTo || '/');
    delete req.session.returnTo;
})

/*
TODO Almost done, missing a few routes
TODO /settings its jus static for now
? >#(different sections of the settings, all same page)
*/
//app.use('/user', userRoutes);

//TODO Almost done, missing a few routes
//app.use('/comic', comicRoutes);

//*Pagina 404 Not Found
app.use((req,res)=>{
    res.status(404).render('404',{tittle: 'Not Found',success:req.flash('success'), error:req.flash('error'), message:req.flash('message')});
})
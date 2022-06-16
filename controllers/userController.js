const bcryptjs = require('bcryptjs');
const pool = require('../database');



const register_get = (req, res) => {
    res.render('./user/register', {tittle: 'register', success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const register_post = async (req,res) => {
    try{
        await pool.query('USE tesis;');

        const isUsername = await pool.query('SELECT name FROM users WHERE name = ?', [req.body.name])
        const isEmail = await pool.query('SELECT email FROM users WHERE email = ?', [req.body.email])

        if(isUsername.length > 0 || isEmail.length > 0){
            req.flash('error','User or Email already registered')
            console.log(req.flash('error'));
            res.redirect('./register');
            return
        }

        //* hash user password
        const hashedPassword = await bcryptjs.hash(req.body.password, 10);
        const user = {
            id: Date.now()+''+Math.floor(Math.random() * 100000),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        }

        //*register the user in database
        await pool.query('USE tesis;');
        await pool.query('INSERT INTO users set ?',[user])
            //*if successful
            .then(req.flash('success','User registered successfuly'))
            .then(res.redirect('../user/login'))


    }catch(err){
        //*if failed return to register
        console.log(err);
        req.flash('error','Something went wrong...')
        res.redirect('../user/register');
    }
}

const settings = async (req, res) => {
    await pool.query('USE tesis;')
    prueba = await pool.query('SELECT * FROM users;')

    res.render('user/settings', {tittle: 'Settings',prueba:prueba})
}

const deleteUser = async (req, res) => {

    //*get user id from get method
    const {id} = req.params;
    console.log({id});

    //* delete suer from database
    await pool.query('USE tesis;');
    await pool.query('DELETE FROM users WHERE ID =?', [id]);

    res.redirect('../../');
}

const editUser_get = async (req, res) => {

    const {id} = req.params;

    await pool.query('USE tesis;');
    const users = await pool.query('SELECT * FROM users WHERE ID =?', [id]);
    res.render('user/editUser', {tittle:'Edit user' ,users:users[0]});

}

const editUser_post = async (req, res) => {

    const {id} = req.params;
    console.log({id});

    try{

        //* hash user password
        const hashedPassword = await bcryptjs.hash(req.body.password, 10);
        const user = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        }

        //*register the user in database
        await pool.query('USE tesis;');
        await pool.query('UPDATE users set ? WHERE ID = ?;',[user,id])
        console.log('Update successful')
        console.log(user)
        res.redirect('../register');
        //res.render('index',{tittle:'index'})

    }catch(err){
        //*if failed return to register
        console.log(err);
        res.redirect('../login/');
    }

}

module.exports ={

    register_get,
    register_post,
    settings,
    deleteUser,
    editUser_get,
    editUser_post
}
const express = require('express');
const controller = require('../controllers/userController');
const  {isLoggedIn, isNotLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const models = require('../models/models');
const path = require('path');
const fs = require('fs');

//Definiendo procesos de Multer, el encargado de subir archivos al servidor
//En este caso, si se desea cambiar de imagen de perfil de usuario
const storageSetting = multer.diskStorage({
    destination:async function(req,response,done){
        let user; await req.user.then(e => {user = e.datavalues;})
        let user_id = req.params.userId;
        user = await models.UserEntry.findByPk(user_id);
        console.log('params :>> ', req.params);

        console.log('user :>> ', user);

        //Primero se hace una busqueda en la bdd para confirmar si ya existe un usuario con el nombre ingresado
        if (req.body.username) {
            let findUser = await models.UserEntry.findOne({
                where: {
                    username: req.body.username
                }
            })
            //Si se encuentra se devuelve un error
            if (findUser) {
                req.flash('error','Este nombre de usuario ya esta siendo utilizado');
                done(new Error('Este nombre de usuario ya esta siendo utilizado'));
                return;
            }

            deleteFolderRecursive(`./public/uploads/users/${user.username}`);
            user.username = req.body.username
        }

        if(!fs.existsSync(path.join(__dirname,'..','/public/uploads/users',user.username))){
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/users',user.username))
        }

        let files = fs.readdirSync(`./public/uploads/users/${user.username}`)

        if (files.length > 0) {
            if (files[0].includes(`user-${user_id}-pfp`)) {
                fs.unlinkSync(`./public/uploads/users/${user.username}/${files[0]}`)
            }
        }
        done(null,'./public/uploads/users/'+user.username)
    },
    filename:async function (req,file,done){
        //Aqui se denomina el nombre de la imagen
        let user; await req.user.then(e => {user = e.dataValues;})
        let user_id = req.params.userId;
        user = await models.UserEntry.findByPk(user_id);

        let pfpName = `user-${user_id}-pfp${path.extname(file.originalname)}`;
        let pfpPath = `/uploads/users/${user.username}/${pfpName}`;
        await models.UserEntry.update({profilePicPath: pfpPath},{
            where: {
                id: user_id
            }
        })
        done(null, pfpName)
    }
})

const uploadSettingsPfp = multer({storage:storageSetting}).single('userPfp');


//Enrutamiento de las configuraciones
router.get('/settings/:userId', isLoggedIn, controller.settings_get);

router.post('/settings/:userId', isLoggedIn, function(req, res, next){
    uploadSettingsPfp(req, res, err =>{
        if (err){
            console.log(err);
            res.redirect('back')
            return
        }
        next()
    })
}, controller.settings_post);

router.get('/deleteUser/:id', controller.deleteUser);

router.get('/profile/:userId',controller.userProfile_get);

router.post('/profile/:userId',controller.userProfile_post);

router.get('/delete/social/:userId/:socialId',controller.deleteNetwork)

function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file) {
          var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
      }
      console.log('borrado');
};

module.exports = router;
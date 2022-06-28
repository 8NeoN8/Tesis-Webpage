const express = require('express');
const controller = require('../controllers/userController');
const  {isLoggedIn, isNotLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const models = require('../models/models');
const path = require('path');
const fs = require('fs');

const storageSetting = multer.diskStorage({
    destination:async function(req,response,done){
        //Aqui es donde se define el lugar o directorio donde se guardara el archivo

        let user_id = req.params.id;
        let user = await models.UserEntry.findByPk(user_id);
        user = user.dataValues;

        if (req.body.username) {
            console.log('username :>> ', req.body.username);
            let findUser = await models.UserEntry.findOne({
                where: {
                    username: req.body.username
                }
            })
            console.log(findUser);
            if (findUser) {
                req.flash('error','Este nombre de usuario ya esta siendo utilizado')
                done(new Error('Este nombre de usuario ya esta siendo utilizado'))
            }
            deleteFolderRecursive(`./public/uploads/users/${user.username}`);
            user.username = req.body.username
        }

        if(fs.existsSync(path.join(__dirname,'..','/public/uploads/users',user.username))){
        }else{
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/users',user.username))
        }

        let files = fs.readdirSync(`./public/uploads/users/${user.username}`)

        if (files.length > 0) {
            if (files[0].includes(`user-${user_id}-pfp`)) {
                fs.unlinkSync(files[0])
            }
        }
        done(null,'./public/uploads/users/'+user.username)
    },
    filename:async function (req,file,done){
        //Aqui se denomina el nombre de la imagen
        let user_id = req.params.id;
        let user = await models.UserEntry.findByPk(user_id);
        user = user.dataValues;
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


//*Done
router.get('/settings/:id', isLoggedIn, controller.settings_get);
//*Done
router.post('/settings/:id', isLoggedIn, function(req, res, next){
    uploadSettingsPfp(req, res, err =>{
        if (err){
            console.log(err);
            res.redirect('back')
            return
        }
        next()
    })}, controller.settings_post);
//*Done
router.get('/deleteUser/:id', controller.deleteUser);

//TODO
router.get('/profile/:userId',controller.userProfile_get);
//TODO
router.post('/profile/:userId',controller.userProfile_post);
//TODO
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

/*
!hacer main page shit
!sistema de notifs de seguidos
!acomodar el read(nuevo modo de mostrar las imagenes y poner las configuraciones/controles)



!hacer admin pages

!hacer reportes(solo los admins)

!agregar sugerencias de usuarios para admins

!sistema de mensaje global de admins



TODO arreglar imagen de bdd

*/
const bcryptjs = require('bcryptjs');
const pool = require('../database');
const models = require('../models/models');
const helpers = require('../lib/helpers')
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const settings_get = async (req, res) => {
    let user; if (await req.user) {
        await req.user.then(e => {user = e;})
    }

    let userId = req.params.userId

    if (user[0].id !== parseInt(userId)) {
        req.flash('error','Usuario no permitido para editar');
        res.redirect('back');
        return
    }

    const title = `Configuracion ${user[0].username}`

    res.render('user/settings', {title: title, user:user, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const settings_post = async (req, res) => {
    let user; await req.user.then(e => {user = e;})

    let userId = req.params.userId;
    console.log('userId :>> ', userId);


    //Primero se verifica que el usuario sea correcto
    if (user[0].id !== parseInt(userId)) {
        req.flash('error','Usuario no permitido para editar');
        res.redirect('back');
        return
    }
    let userentry = await models.UserEntry.findByPk(req.params.userId)
    userentry = userentry.dataValues

    //Si el usuario es correcto se toman y modifican los datos que se hayan ingresado

    //Opciones para los comics --------

    //Opcion para elegir la direccion de paso de pagina del comic, izquierda-derecha, derecha-izquierda, arriba-abajo, abajo-arriba
    if (req.body.pageTurn) {
        await models.SettingsEntry.update({value:req.body.pageTurn},{
            where: {
                user_id: userId,
                setting:"pageTurnDirection"
            }
        })
    }

    //Opcion para el salto de posicion de la pagina al cambiar de pagina, saltar al tope de la imagen o no saltar
    if (req.body.jumpPage) {
        await models.SettingsEntry.update({value:req.body.jumpPage},{
            where: {
                user_id: userId,
                setting:"jumpOnPageTurn"
            }
        })
    }

    //Opcion para elegir uno de los colores pre-establecidos para el comic
    if (req.body.colorFilter) {
        await models.SettingsEntry.update({value:req.body.colorFilter},{
            where: {
                user_id: userId,
                setting:"colorFilter"
            }
        })
    }

    //Aqui si se eligio, se puede ingresar un color personalizado
    if (req.body.customColor) {
        await models.UserEntry.update({value:req.body.customColor},{
            where: {
                user_id: userId,
                setting:"colorFilter"
            }
        })
    }

    //Y por ultimo en opciones de comic se define si el filtro se activa o no
    if (req.body.filterOnOff) {
        await models.SettingsEntry.update({value:req.body.filterOnOff},{
            where: {
                user_id: userId,
                setting:"filterOnOff"
            }
        })
    }

    //Opciones de cuenta

    //cambio de nombre de usuario, esto conlleva a muchos cambios en los datos de la app
    if (req.body.username) {
        //primero se busca si no hay un usuario que ya tenga el alias que se ingreso
        let findUser = await models.UserEntry.findOne({
            where: {
                username: req.body.username
            }
        })
        if (findUser) {
            req.flash('error','Este nombre de usuario ya esta siendo utilizado')
            res.redirect('back')
            return
        }

        //Si no lo hay, por ende esta disponible, se cambian todos los registros del antiguo nombre de usuario
        await models.UserEntry.update({username: req.body.username},{
            where: {
                id: userId
            }
        })

        await models.ComicEntry.update({comicWriter: req.body.username},{
            where: {
                comicWriter: userentry.username
            }
        })


        //Aqui se lleva a cabo el cambio en el directorio del usuario
        let dirPath = path.join(__dirname,'..','/public/uploads/users/',userentry.username)
        if(fs.existsSync(`./public/uploads/users/${userentry.username}`)){
            fs.renameSync(path.join(__dirname,'..','/public/uploads/users',userentry.username),path.join(__dirname,'..','/public/uploads/users',req.body.username));
            let pfpName;
            let pfpPath;
            let files = fs.readdirSync(`./public/uploads/users/${req.body.username}`)
            for (const file of files) {
                if (path.extname(file)) {
                    pfpName = `user-${userentry.id}-pfp${path.extname(file)}`;
                }
            }

            //Se cambia en la bdd la direccion de la foto de perfil del usuario
            pfpPath = `/uploads/users/${req.body.username}/${pfpName}`;
            await models.UserEntry.update({profilePicPath: pfpPath},{
                where: {
                    id: userentry.id
                }
            })
        }
    }

    //Cambio de email si se desea
    if (req.body.email) {
        let findEmail = await models.UserEntry.findOne({
            where: {
                email: req.body.email
            }
        })
        console.log(findEmail);
        if (findEmail) {
            req.flash('error','Este email ya esta siendo utilizado')
            res.redirect('back')
            return
        }

        //despues de buscar y asegurar que no esta registrado el email nuevo, se actualiza y guarda
        await models.UserEntry.update({email: req.body.email},{
            where: {
                id: userId
            }
        })
    }

    //Si se desa cambiar la contraseña, el usuario debe de ingresar su contraseña actual, la nueva, y confirmar la contraseña nueva
    if (req.body.oldPassword && req.body.newPassword && req.body.confirmNewPassword) {
        if (req.body.newPassword === req.body.confirmNewPassword) {
            if (helpers.matchPassword(req.body.newPassword, req.body.oldPassword)) {
                await models.UserEntry.update({password: helpers.encryptPassword(req.body.newPassword)},{
                    where: {
                        id: userId
                    }
                })
            }
        }
    }

    res.redirect('back')
}

/* if (req.body.theme){
    await models.SettingsEntry.update({value:req.body.theme},{
        where: {
            user_id: req.params.id,
            setting:"theme"
        }
    })
} */

const deleteUser = async (req, res) => {


    const userId = req.params.id;

    if (await models.UserEntry.findOne({
        where: {
            id:userId
        }
    })){
        await models.UserEntry.destroy({
            where: {
              id: userId
            }
        });
    }

    if (await models.SettingsEntry.findOne({
        where: {
            id:userId
        }
    })){
        await models.SettingsEntry.destroy({
            where: {
                user_id: userId
            }
        })
    }

    if (await models.SocialEntry.findOne({
        where: {
            id:userId
        }
    })){
        await models.SocialEntry.destroy({
            where: {
                user_id: userId
            }
        })
    }

    if (await models.CommentEntry.findOne({
        where: {
            id:userId
        }
    })){
        await models.CommentEntry.destroy({
            where: {
                user_id: userId
            }
        })
    }

    req.flash('success','Usuario eliminado exitosamente')
    res.redirect('back');
}

const userProfile_get = async (req, res) => {

    let user;
    let isUploader = false;
    let userId = req.params.userId;

    if (req.user) {
        await req.user.then( e => {user = e});
        if (user[0].id === userId) {
            isUploader = true;
        }
    }
    let userEntry = await models.UserEntry.findByPk(userId);

    if (!userEntry) {
        req.flash('error','El usuario no existe');
        res.redirect('back');
        return;
    }

    userEntry = userEntry.dataValues;

    let networks = await models.SocialEntry.findAll({
        where: {
            user_id: userEntry.id,
        }
    });

    let comics = await models.ComicEntry.findAll({
        where: {
            comicUploader_id: userEntry.id
        }
    })

    if (comics.length > 0) {
        for (let i = 0; i < comics.length-1; i++) {
            comics[i] = comics[i].dataValues;
        }
    }

    let title = `Perfil de ${userEntry.username}`

    res.render('user/userProfile',{title:title, user:user, profileUser:userEntry, isUploader:isUploader, networks:networks, comics:comics,  success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})

}

const userProfile_post = async (req, res) => {
    let user; if (req.user) await req.user.then(e => {user = e[0].dataValues;})

    let userId = parseInt(req.params.userId);

    console.log('socialSel :>> ', req.body.socialSel);
    console.log('socialLink :>> ', req.body.socialLink);

    let socialSel = req.body.socialSel
    let socialLink = req.body.socialLink


    if (user.id !== userId) {
        req.flash('error','Usuario no permitido para editar');
        res.redirect('back');
        return
    }

    let newSocial;

    let checkL = `https://www.${socialSel}`
    console.log('checkL :>> ', checkL);

    if(socialSel.includes(checkL)){
        console.log('tabien');
    }
    try {
        switch (socialSel) {
            case "twitter":
                if (!socialLink.includes(`https://${socialSel}.com`)) {
                    req.flash('error','El link no es valido para esta red social');
                    console.log('putasea');
                    res.redirect('back');
                    return;
                }
                newSocial = await models.SocialEntry.create({user_id:userId, networkName:req.body.socialSel, networkLink:socialLink})
                break;

            case "facebook":
                if (!socialLink.includes(`https://www.${socialSel}.com`)) {
                    req.flash('error','El link no es valido para esta red social');
                    res.redirect('back');
                    return;
                }
                newSocial = await models.SocialEntry.create({user_id:userId, networkName:req.body.socialSel, networkLink:socialLink})
                break;

            case "pinterest":
                if (!socialLink.includes(`https://www.${socialSel}`)) {
                    req.flash('error','El link no es valido para esta red social');
                    res.redirect('back');
                    return;
                }
                newSocial = await models.SocialEntry.create({user_id:userId, networkName:req.body.socialSel, networkLink:socialLink})
                break;

            case "pixiv":
                if (!socialLink.includes(`https://www.${socialSel}.net`)) {
                    req.flash('error','El link no es valido para esta red social');
                    res.redirect('back');
                    return;
                }
                newSocial = await models.SocialEntry.create({user_id:userId, networkName:req.body.socialSel, networkLink:socialLink})
                break;
            case "instagram":
                if (!socialLink.includes(`https://www.${socialSel}.com`)) {
                    req.flash('error','El link no es valido para esta red social');
                    res.redirect('back');
                    return;
                }
                newSocial = await models.SocialEntry.create({user_id:userId, networkName:req.body.socialSel, networkLink:socialLink})
                break;

            default:
                req.flash('error','No se eligio una red social valida');
                res.redirect('back');
                break;
        }
        req.flash('success','Red social Agregada')
         res.redirect('back');
    } catch (error) {
        req.flash('error','Hubo un problemas inesperado, intentelo de nuevo');
        res.redirect('back');
    }


}

const deleteNetwork = async (req, res) => {
    let user; await req.user.then(e => {user = e[0].dataValues;})

    let userId = parseInt(req.params.userId);
    let socialId = parseInt(req.params.socialId);
    console.log('userId :>> ', userId);
    console.log('socialId :>> ', socialId);

    if (user.id !== userId) {
        req.flash('error','Usuario no permitido para editar');
        res.redirect('back');
        return
    }

    await models.SocialEntry.destroy({
        where: {
            user_id: userId,
            id: socialId
        }
    })

    req.flash('success','Red social eliminada')
    res.redirect('back');
}

module.exports ={
    settings_get,
    settings_post,
    deleteUser,
    userProfile_get,
    userProfile_post,
    deleteNetwork,
}
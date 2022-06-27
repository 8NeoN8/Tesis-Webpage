const bcryptjs = require('bcryptjs');
const pool = require('../database');
const models = require('../models/models');
const helpers = require('../lib/helpers')
const bcrypt = require('bcrypt');

const settings_get = async (req, res) => {
    let user; await req.user.then(e => {user = e[0].dataValues;})

    const title = `Configuracion ${user.username}`

    res.render('user/settings', {title: title, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const settings_post = async (req, res) => {
    let user; await req.user.then(e => {user = e[0].dataValues;})

    //let settings = await models.SettingsEntry

    let userentry = await models.UserEntry.findByPk(req.params.id)

    userentry = userentry.dataValues


    if (req.body.pageTurn) {
        await models.SettingsEntry.update({value:req.body.pageTurn},{
            where: {
                user_id: req.params.id,
                setting:"pageTurnDirection"
            }
        })
    }

    if (req.body.imgScalling) {
        await models.SettingsEntry.update({value:req.body.imgScalling},{
            where: {
                user_id: req.params.id,
                setting:"imgScalling"
            }
        })
    }

    if (req.body.jumpPage) {
        await models.SettingsEntry.update({value:req.body.jumpPage},{
            where: {
                user_id: req.params.id,
                setting:"jumpOnPageTurn"
            }
        })
    }

    if (req.body.colorFilter) {
        await models.SettingsEntry.update({value:req.body.colorFilter},{
            where: {
                user_id: req.params.id,
                setting:"colorFilter"
            }
        })
    }

    if (req.body.customColor) {
        await models.UserEntry.update({value:req.body.customColor},{
            where: {
                user_id: req.params.id,
                setting:"colorFilter"
            }
        })
    }

    if (req.body.filterOnOff) {
        await models.SettingsEntry.update({value:req.body.filterOnOff},{
            where: {
                user_id: req.params.id,
                setting:"filterOnOff"
            }
        })
    }

    if (req.body.imgDisplay) {
        await models.SettingsEntry.update({value:req.body.imgDisplay},{
            where: {
                user_id: req.params.id,
                setting:"imgDisplay"
            }
        })
    }

    if (req.body.focusMode) {
        await models.SettingsEntry.update({value:req.body.focusMode},{
            where: {
                user_id: req.params.id,
                setting:"focusMode"
            }
        })
    }

    if (req.body.username) {
        let findUser = await models.UserEntry.findOne({
            where: {
                username: req.body.username
            }
        })
        console.log(findUser);
        if (findUser) {
            req.flash('error','Este nombre de usuario ya esta siendo utilizado')
            res.redirect('back')
            return
        }
        await models.UserEntry.update({username: req.body.username},{
            where: {
                id: req.params.id
            }
        })
    }

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
        await models.UserEntry.update({email: req.body.email},{
            where: {
                id: req.params.id
            }
        })
    }

    if (req.body.theme){
        await models.SettingsEntry.update({value:req.body.theme},{
            where: {
                user_id: req.params.id,
                setting:"theme"
            }
        })
    }

    if (req.body.oldPassword && req.body.newPassword && req.body.confirmNewPassword) {
        if (req.body.newPassword === req.body.confirmNewPassword) {
            if (helpers.matchPassword(oldPassword,userentry.password)) {
                await models.UserEntry.update({password: helpers.encryptPassword(req.body.newPassword)},{
                    where: {
                        id: req.params.id
                    }
                })
            }
        }
    }

    res.redirect('back')
}

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


module.exports ={
    settings_get,
    settings_post,
    deleteUser,
}
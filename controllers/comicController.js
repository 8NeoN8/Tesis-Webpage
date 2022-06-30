const fs = require('fs');
const path = require('path');
const pool = require('../database');
const StreamZip = require('node-stream-zip');
const { use } = require('passport');
const models = require('../models/models');
const { nextTick } = require('process');
const helpers = require('../lib/helpers')

const create_get = async (req, res) => {
    res.render('comic/create', {title: 'Create Comic Entry', success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const create_post =  async (req, res) => {
    console.log('entro');
    console.log(req.body.comicName);
    try {
        let user;
        await req.user.then(e => {
            user = e[0];
        })
        console.log(user.dataValues.id,"el primero id");

        //Aqui se crea la fecha actual para asignar como valor por defecto de la fecha de inicio si el usuario no elige una
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();

        today = mm + '/' + dd + '/' + yyyy;

        //Verificando si el usuario es el autor del comic
        let writer;
        if (req.body.comicWriter) {
            writer = req.body.comicWriter
            console.log(writer);
        }else writer = user.dataValues.username

        //Eliminando espacios en el nombre del autor si los hay
        if(writer.includes(" ")){
            writer = writer.replaceAll(" ","-")
        }
        //Eliminando espacios en el nombre del comic si los hay para evitar problemas de lectura con el programa
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = req.body.comicName.replaceAll(" ","-");
        }

        //Directorio del comic
        let dirPath = './public/uploads/'+comicName

        //Verificando que exista el directorio del comic, si no existe, se crea
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/',comicName), err => {
                if(err) {
                    req.flash('error','Error. Hubo un problema al crear la carpeta del comic, intentelo de nuevo');
                    res.redirect('./comic/create')
                }
            })
        }

        //Si se introdujo fecha de inicio se guarda, sino, se coloca automaticamente la fecha actual
        let startDate = today;
        if (req.body.comicStart) {
            startDate = req.body.comicStart;
        }

        //Obteniendo la direccion del la portada para guardar y usar posteriormente
        let fileName;
        let coverPath;
        let tmpPath = './public/uploads/'+comicName
        const files = fs.readdirSync(tmpPath);
        for (const file of files) {
            if (file) {
                if (file.toLowerCase().includes((comicName+"-CoverImage").toLowerCase())){
                    fileName = file;
                    break;
                }
            }
        }
        coverPath = '/uploads/'+comicName+'/'+fileName;
        console.log('coverPath :>> ', coverPath);

        //Creando y guardando el registro del comic
        const comic = await models.ComicEntry.create({
            comicUploader_id: user.dataValues.id,
            comicName: comicName,
            comicDescription: req.body.comicDescription,
            comicStatus: req.body.comicStatus,
            comicSchedule: req.body.comicSchedule,
            comicWriter:writer,
            comicCoverPath: coverPath,
            comicCategories:req.body.selectedCats,
            comicStart: startDate
        })
        .then(req.flash('success','El comic se aregistrado exitosamente'))
        .then(res.redirect('../'))
        console.log(JSON.stringify(comic))

    } catch (err) {
        req.flash('error','Error. No se pudo crear el comic, intentelo de nuevo')
        console.log(err);
        res.redirect('../comic/create')

        //Si hubo un problema se elimina la carpeta del comic para permitir un nuevo intento
        try {
            let path = './public/uploads/'+req.body.comicName

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
            };
            deleteFolderRecursive(path);
        } catch (error) {
            console.log(error);
        }

    }
}

const upload_get = async (req, res) => {
    let params = await req.params
    let user = await req.user
    let comicSelected = [];
    let comics = [];

    const uploaderComics = await models.ComicEntry.findAll({
        where: {
            comicUploader_id: user[0].dataValues.id,
        }
    })

    for (let i = 0; i <= uploaderComics.length-1; i++) {
        comics[i] = uploaderComics[i].dataValues
    }

    if (await req.params) {
        if(Object.keys(params).length > 0){
            comicSelected = await models.ComicEntry.findAll({
                where:{
                    comicName: params.comicName
                }
            })
            if (comicSelected.length > 0) {
                res.render('comic/chooseComic', {title: 'Upload Comic Chapter',params:params, user:user, comics:comics, comicSelected:comicSelected, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
            }else{
                res.redirect('../')
            }
        }else{
            res.render('comic/chooseComic', {title: 'Upload Comic Chapter',params:params,user:user, comics:comics, comicSelected: comicSelected, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
        }
    } else res.render('comic/chooseComic', {title: 'Upload Comic Chapter',params:params,user:user, comics:comics, comicSelected: comicSelected, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})


}

const upload_post = async (req, res) => {
    try {
        let user;
        await req.user.then(e => {
            user = e[0];
        })
        let params  = req.params;
        let fileName;
        let bodynumber = req.body.numberChapter;
        let dirPath = './public/uploads/'+params.comicName+'/capitulo-'+bodynumber;

        const files = fs.readdirSync(dirPath);
        console.log(path.extname(files[0]),' del array');


        for (const file of files) {

            let filePath = dirPath+'/'+path.basename(file);

            if (path.extname(file) !== ".zip" && path.extname(file) !== ".7z") {
                console.log("dentro del if");
                try {
                    fs.unlinkSync(filePath).then(console.log("se borro por ser invalido"));
                    fs.rmdirSync(dirPath)
                    req.flash('error','El archivo que se subio no es .zip o .7z');
                    res.redirect('../'+params.comicUploader+'/'+params.comicName);
                } catch (err) {
                    console.log(err);
                    req.flash('error','Ocurrio un problema tratando de borrar el archivo invalido');
                    res.redirect('../'+params.comicUploader+'/'+params.comicName);
                    break;
                }
            }

            fileName = path.basename(file);
            console.log(fileName,' en el for');


            const zipfile = './public/uploads/'+params.comicName+'/capitulo-'+bodynumber+'/'+fileName;

            console.log('zipfile :>> ', zipfile);

            const zip = new StreamZip.async({file: zipfile})

            const count = await zip.extract(null,`./public/uploads/${params.comicName}/capitulo-${bodynumber}`)
            console.log(`Extracted ${count} entries`);
            zip.on('entry', entry => {
                console.log(`Read entry ${entry.name}`);
            });

            await zip.close();
            fs.unlinkSync(zipfile);
        };

        const allPages = fs.readdirSync(dirPath);
        console.log(allPages);

        for (const page of allPages) {
            if (path.extname(page) !== '.jpg' && path.extname(page) !== '.png' && path.extname(page) !== '.jpeg') {
                for (const page of allPages) {
                    fs.unlinkSync(page)
                }
                fs.rmdirSync(chapterPages)
                req.flash('error','Oops, parece que subiste imagenes con formatos diferentes a los permitidos: jpeg, jpg, png. Por favor vuelve a intentarlo.')
                res.redirect('../'+params.comicUploader+'/'+params.comicName);
                throw "Los archivos dentro del zip no eran imagenes validas"
            }
        };
        let comic = await models.ComicEntry.findAll({
            where:{
                comicName: params.comicName
            }
        })

        console.log('comic :>> ', JSON.stringify(comic));
        comic = comic[0].dataValues
        console.log('comic.id :>> ', comic.id);

        const chapter = await models.ChapterEntry.create({
            chapterTitle: req.body.titleChapter,
            chapterNumber: req.body.numberChapter,
            comic_id: comic.id}
        );
        console.log('chapter :>> ', JSON.stringify(chapter));
        req.flash('success','Capitulo subido con exito');
        res.redirect('../');

    } catch (err) {
        req.flash('error','Error. No se pudo subir el capitulo, intentelo de nuevo')
        console.log(err);

        let path = './public/uploads/'+req.params.comicName+'/capitulo-'+req.body.numberChapter;

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
        deleteFolderRecursive(path);
        res.redirect('../comic/upload')

    }
}

const profile_get = async (req,res) => {
    const comicId = req.params.comicId
    let user;
    let uploader = false;
    if(await req.user){
        await req.user.then(e => {
            user = e;
        })
    }

    const comicEntry = await models.ComicEntry.findByPk(comicId)

    const comic = comicEntry.dataValues;


    if (user) {
        if (user[0].id === comic.comicUploader_id) {
            uploader = true
        }
    }

    let chapters = await models.ChapterEntry.findAll({
        where:{
            comic_id: comic.id
        }
    })

    let uploaderData = await models.UserEntry.findAll({
        where:{
            id: comic.comicUploader_id
        }
    })

    for (let chapter of chapters) {
        chapter = chapter.dataValues;
    }

    let categories = comic.comicCategories.split(',');
    categories.shift();

    let hasLiked = false;

    let userLike;
    if (user) {
        userLike = await models.likeEntry.findOne({
            where: {
                user_id: user[0].id,
                comic_id: comicId
            }
        })
        if(userLike){
            hasLiked = true
        }
    }

    const likes = await models.likeEntry.count({
        where: {
            comic_id: comicId
        }
    })

    res.render('./comic/profile',{ uploaderData:uploaderData,hasLiked:hasLiked, likes:likes, isUploader: uploader, comic:comic, categories: categories, chapters:chapters ,title: comic.comicName, user:user, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
}

const read_get = async (req, res) =>{

    let user; if (req.user) {
        await req.user.then( e => {user = e} );
    }
    let settings;
    const params = req.params;

    let Comic = await models.ComicEntry.findAll({
        where:{
            id: params.comicId
        }
    })
    Comic = Comic[0].dataValues

    let chapter = await models.ChapterEntry.findOne({
        where: {
            comic_id: params.comicId,
            chapterNumber: params.chapter
        }
    })
    chapter = chapter.dataValues;

    const dirPath = "./public/uploads/"+Comic.comicName+"/capitulo-"+params.chapter;

    const files = fs.readdirSync(dirPath);

    const amountPages = files.length;

    const title = 'Leer '+Comic.comicName+' - '+params.chapter;

    const chapterPath = `/uploads/${Comic.comicName}/capitulo-${params.chapter}`
    let currentPage = parseInt(params.page);
    let prev = currentPage-1;
    let next = currentPage+1;

    if (currentPage <= 0) {
        currentPage = 1;
    }

    if (currentPage === 1) {
        prev = 1;
    }

    if (currentPage >= amountPages) {
        currentPage = amountPages;
        prev = currentPage-1
        next = amountPages;
    }

    const currentLink = `/read/${Comic.id}/${params.chapter}/${currentPage}`
    const nextPage = `/read/${Comic.id}/${params.chapter}/${next}`
    const prevPage = `/read/${Comic.id}/${params.chapter}/${prev}`

    let comments = await models.CommentEntry.findAll({
        where:{
            comic_id: Comic.id,
            chapter_id: chapter.id
        }
    })

    for (let i = 0; i < comments.length; i++) {
        comments[i] = comments[i].dataValues;
        let user = await models.UserEntry.findByPk(comments[i].user_id);
        comments[i].username = user.username;
    }

    const Url =  req.originalUrl;


    if (user) {
        let Setts = await models.SettingsEntry.findAll({
            where: {
                user_id: user[0].id,
            }
        })

        for (let setting of Setts) {
            setting = setting.dataValues
        }

        settings = {
            pageTurnDirection: Setts[0].value,
            imgScalling: Setts[1].value,
            jumpOnPageTurn: Setts[2].value,
            colorFilter: Setts[3].value,
            filterOnOff: Setts[4].value,
            imgDisplay: Setts[5].value,
            focusMode: Setts[6].value,
        };

    }

    res.render('comic/read',{title: title, user:user, settings:settings, comic:Comic, chapter:chapter, chapterPath:chapterPath, files:files, amountPages:amountPages, currentPage:currentPage, prevPage:prevPage, nextPage:nextPage, currentLink:currentLink, comments:comments, Url:Url,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const read_post = async (req, res) =>{
    let user; if (req.user) await req.user.then( e => {user = e[0].dataValues} );
    params = req.params

    const chapter = await models.ChapterEntry.findOne({
        where: {
            id: params.chapter,
            comic_id: params.comicId,
        }
    })

    const comic = await models.ComicEntry.findOne({
        where: {
            id: params.comicId
        }
    })

    const comment = await models.CommentEntry.create({
        user_id: user.id,
        chapter_id: chapter.dataValues.id,
        comic_id: comic.dataValues.id,
        commentText: req.body.commentText
    })

    res.redirect('back')
}

const edit_comic_get = async (req, res) => {

    let uploader = req.params.uploaderId;
    let user = await req.user;
    user = user[0].dataValues;

    console.log(uploader);

    console.log(user.id);

    if (user.id !== parseInt(uploader)) {
        req.flash('error','Error. User not allowed to edit');
        res.redirect('/');
        return;
    }

    if (user.id === parseInt(uploader)) {
        res.render('comic/editComic', {title: 'Edit Comic Entry', user:user, uploaderId:req.params.uploaderId,comicId:req.params.comicId, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
    }
}

const edit_comic_post = async (req, res) =>{

    let comicId = await req.params.comicId;
    let uploaderId = await req.params.uploaderId;
    console.log('params :>> ', req.params);
    let user; if (await req.user){
        req.user.then( e => { user = e[0] });
    }

    let oldComicData = await models.ComicEntry.findOne({
        where:{
            id: comicId,
            comicUploader_id: uploaderId
        }
    })
    oldComicData = oldComicData.dataValues;

    if (await req.body.comicName){
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = req.body.comicName.replaceAll(" ","-");
        }

        let oldPath = path.join(__dirname,'..','/public/uploads/',oldComicData.comicName)
        let newPath = path.join(__dirname,'..','/public/uploads/',comicName)

        try {
            if (fs.existsSync(newPath)) {
                req.flash('error','Ese Comic ya existe');
                res.redirect('back');
                return;
            }

            fs.mkdirSync(newPath);

            let moveChapters = fs.readdirSync(oldPath);

            moveChapters.forEach(chapterFolder => {
                try {
                    fs.renameSync(path.join(__dirname,'..','/public/uploads/',oldComicData.comicName,chapterFolder),path.join(__dirname,'..','/public/uploads/',comicName,chapterFolder))
                } catch (err) {
                    console.log(err);
                    req.flash('error','Hubo un problema al cambiar de directorio');
                    res.redirect('back');
                    return;
                }
            });
            try {
                fs.rmdirSync(oldPath)
            } catch (error) {
                console.log(err);
                req.flash('error','Hubo un problema al borrar el viejo directorio');
                res.redirect('back');
                return;
            }
        } catch (error) {
            req.flash('error','Hubo un problema inesperado');
            console.log('error :>> ', error);
            res.redirect('back');
        }

        let coverImage
        let searchCover = fs.readdirSync(newPath)
        searchCover.forEach(file => {
            if(!path.extname(file)) {
                console.log(file,"no extension");
            }
            coverImage = file;

        });
        console.log('coverImage :>> ', coverImage);
        let newCoverImage = `${comicName}-CoverImage${path.extname(coverImage)}`

        fs.renameSync(path.join(__dirname,'..','/public/uploads/',comicName,coverImage), path.join(__dirname,'..','/public/uploads/',comicName,newCoverImage))

        let newCoverPath = `/uploads/${comicName}/${newCoverImage}`;

        await models.ComicEntry.update({comicCoverPath: newCoverPath,comicName:comicName},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })

    }
    if (await req.body.comicDescription){
        await models.ComicEntry.update({comicDescription: req.body.comicDescription},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    if (await req.body.comicSchedule){
        await models.ComicEntry.update({comicSchedule: req.body.comicSchedule},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    if (await req.body.comicStart){
        await models.ComicEntry.update({comicStart: req.body.comicStart},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    if (await req.body.comicStatus){
        await models.ComicEntry.update({comicStatus: req.body.comicStatus},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    if (await req.body.comicWriter) {
        await models.ComicEntry.update({comicWriter: req.body.comicWriter},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    if(await req.body.selectedCats){
        console.log(req.body.selectedCats);
        console.log('comicId :>> ', comicId);
        console.log('uploaderId :>> ', uploaderId);
        await models.ComicEntry.update({comicCategories: req.body.selectedCats},{
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })
    }
    res.redirect(`/read/${oldComicData.id}`);

}

const delete_comic_post = async (req, res) => {

    let comicId = req.params.comicId
    let uploaderId = req.params.uploaderId
    let user = await req.user
    user = user[0].dataValues

    console.log('params :>> ', req.params);

    let uploaderData = await models.UserEntry.findOne({
        where: {
            id: uploaderId
        }
    })
    let comicData = await models.ComicEntry.findOne({
        where: {
            id: comicId
        }
    })

    if (user.id !== uploaderData.id && user.role === 0 ) {
        console.log('no es uploader o admin');
        req.flash('error','Parece que no esta autorizado para borrar este comic, como llegaste hasta aqui?');
        res.redirect('/');
        return;
    }

    if(!req.body.confirmComicDelete){
        console.log(req.body.confirmComicDelete," 2");
        console.log('no confirm');
        req.flash('error','Debe confirmar con su contraseña para borrar comics');
        res.redirect('back');
        return;
    }

    if (user.role === 1) {
        if (!helpers.matchPassword(req.body.confirmComicDelete, user.password)) {
            console.log('incorrecta');
            req.flash('error','Contraseña incorrecta');
            res.redirect('back');
            return;
        }
    }else{
        if (!helpers.matchPassword(req.body.confirmComicDelete, uploaderData.password)) {
            console.log('incorrecta');
            req.flash('error','Contraseña incorrecta');
            res.redirect('back');
            return;
        }
    }

    try {
        await models.ComicEntry.destroy({
            where: {
                id: comicId,
                comicUploader_id: uploaderId
            }
        })

        await models.ChapterEntry.destroy({
            where: {
                comic_id: comicId,
            }
        })

        await models.CommentEntry.destroy({
            where: {
                comic_id: comicId,
            }
        })

        await models.likeEntry.destroy({
            where: {
                comic_id: comicId,
            }
        })
    } catch (err) {
        console.log(err);
        req.flash('error','No se pudo borrar correctamente de la bdd');
        res.redirect('back');
        return;
    }

    deleteFolderRecursive(`./public/uploads/${comicData.comicName}`)

    req.flash('success','Comic borrado sin problemas');
    res.redirect('/');
}

const delete_chapter_get = async (req, res) => {

    let comicId = req.params.comicId;

    let chapId = req.params.chapterId;
    let user = await req.user;
    user = user[0].dataValues;

    let comicData = await models.ComicEntry.findByPk(comicId);

    let uploaderId = comicData.comicUploader_id;

    let uploaderData = await models.UserEntry.findByPk(uploaderId);

    if (user.id !== uploaderData.id && user.role === 0) {
        req.flash('error','Parece que no esta autorizado para borrar este capitulo, como llegaste hasta aqui?');
        res.redirect('/');
        return;
    }

    let chapterData = await models.ComicEntry.findByPk(chapId);

    try {
        await models.ChapterEntry.destroy({
            where: {
                id: chapId,
                comic_id: comicId
            }
        })

        await models.CommentEntry.destroy({
            where: {
                chapter_id: chapId,
                comic_id: comicId
            }
        })
    } catch (err) {
        console.log(err);
        req.flash('error','No se pudo borrar correctamente de la bdd');
        res.redirect('back');
        return;
    }

    deleteFolderRecursive(`./uploads${comicData.comicName}/capitulo-${chapterData.chapterNumber}`);

    req.flash('success','El capitulo fue removido');
    res.redirect('back');
}

const likes_post = async (req, res) => {
    let user; if(req.user){
        await req.user.then(e => {user = e[0]});
        user = user.dataValues;
    }
    let comicId = req.params.comicId;

    let hasLiked = req.params.hasLiked;

    if (hasLiked !== "true") {
        let newLike = await models.likeEntry.create({user_id: user.id, comic_id: comicId});
        res.redirect('back');
        return
    }

    await models.likeEntry.destroy({
        where: {
            user_id: user.id,
            comic_id: comicId
        }
    })

    res.redirect('back');
}

const deleteComment_post = async (req, res) => {
    let user; if(req.user){
        await req.user.then(e => {user = e[0]});
        user = user.dataValues;
    }

    let commentId = req.params.commentId;

    let comment = await models.CommentEntry.findByPk(commentId);

    console.log(comment.dataValues);

    if (user.id !== comment.dataValues.user_id && user.role === 0) {
        req.flash('error','Usuario no permitido para editar')
        res.redirect('back')
    }

    await models.CommentEntry.destroy({
        where: {
            id: commentId
        }
    })

    req.flash('success','Commentario removido')
    res.redirect('back')
}

function deleteFolderRecursive(path) {
    try {
        if(fs.existsSync(path) ) {
            console.log('existe');
            fs.readdirSync(path).forEach(function(file) {
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
            console.log('borrado');
        }else console.log('noexiste?');
    } catch (err) {
        console.log(err);
        req.flash('error','Hubo un problema borrando el directorio, intentelo de nuevo');
        res.redirect('back');
        return;
    }

};


module.exports = {
    create_get,
    create_post,
    upload_get,
    upload_post,
    profile_get,
    read_get,
    read_post,
    edit_comic_get,
    edit_comic_post,
    delete_comic_post,
    delete_chapter_get,
    likes_post,
    deleteComment_post,
}
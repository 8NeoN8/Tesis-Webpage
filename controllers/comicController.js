const fs = require('fs');
const path = require('path');
const pool = require('../database');
const StreamZip = require('node-stream-zip');
const { use } = require('passport');
const models = require('../models/models');
const { nextTick } = require('process');
const helpers = require('../lib/helpers')

const create_get = async (req, res) => {
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /create get:>> ', user);
    }
    res.render('comic/create', {title: 'Create Comic Entry',user:user, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const create_post =  async (req, res) => {

    try {
        //Primero se obitne el usuario para usar sus datos al guardar
        let user; if (await req.user) {
            await req.user.then( e => {user = e[0].dataValues} );
            console.log('user en /create post:>> ', user);
        }

        //Aqui se crea la fecha actual para asignar como valor por defecto de la fecha de inicio si el usuario no elige una
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        today = mm + '/' + dd + '/' + yyyy;

        //Verificando si el usuario ingreso un autor para el comic, sino se toma al usuario como autor
        let writer = user.dataValues.username;
        if (req.body.comicWriter) {
            writer = req.body.comicWriter
        }

        //Eliminando espacios en el nombre del autor si los hay para evitar problemas de lectura con el programa
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

        //Obteniendo la direccion de la portada para guardar y usar posteriormente
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
        req.flash('success','El comic se ha registrado exitosamente')
        res.redirect(`../read/${comic.id}`);

    } catch (err) {
        console.log(err);
        req.flash('error','Error. No se pudo crear el comic, intentelo de nuevo')
        res.redirect('back')

        //Si hubo un problema se elimina la carpeta del comic creada anteriormente para permitir un nuevo intento
        let path = './public/uploads/'+req.body.comicName
        try {
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
            req.flash('error',`Error. No se pudo eliminar la carpeta ${path}`)
            res.redirect('back')
        }
    }
}

const upload_get = async (req, res) => {
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /upload get:>> ', user);
    }


    //si se ha elegido un comic a subir capitulo se toma los parametros enviados
    let params
    let comicId
    let uploaderId
    if (await req.params) {
        params = req.params
        comicId = req.params.comicId
        uploaderId = req.params.uploaderId
    }

    console.log('params :>> ', req.params);

    let comicSelected = [];

    //Se busca en la bdd los comics que hayan sido subidos por el usuario para dar a elegir a cual subir un capitulo
    const uploaderComics = await models.ComicEntry.findAll({
        where: {
            comicUploader_id: user.id,
        }
    })

    let comics = [];

    for (let i = 0; i <= uploaderComics.length-1; i++) {
        comics[i] = uploaderComics[i].dataValues
    }

    //Si uno a sido seleccionado y fueron encontrado parametros se muestra la pagina de subida de capitulo
    if (await req.params) {
        comicSelected = await models.ComicEntry.findByPk(comicId)
    }
    //Si no se ha elegido uno, en otras palabras, se esta cargando por primera vez la vista, se muestran los comics del usuario
    //Para que eliga a cual subir un capitulo
    res.render('comic/chooseComic', {title: 'Subir un Capitulo',params:params, user:user, comics:comics, comicSelected: comicSelected, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})

}

const upload_post = async (req, res) => {
    //Una vez enviado el archivo y la informacion del capitulo
    try {
        let user; if (await req.user) {
            await req.user.then( e => {user = e[0].dataValues} );
            console.log('user en /upload post:>> ', user);
        }
        let params; if(await req.params) {
            params = req.params;
        }
        let fileName;
        let bodynumber = req.body.numberChapter;

        //Se indica la direccion del archivo del capitulo y se verifica que tenga una extension valida
        let dirPath = './public/uploads/'+params.comicName+'/capitulo-'+bodynumber;
        const files = fs.readdirSync(dirPath);

        for (const file of files) {

            let filePath = dirPath+'/'+path.basename(file);

            if (path.extname(file) !== ".zip" && path.extname(file) !== ".7z") {
                try {
                    //Si no es valido el archivo se elimina al igual que el directorio por seguridad
                    fs.unlinkSync(filePath).then(console.log("No era un archivo valido, se a borrado por seguridad"));
                    fs.rmdirSync(dirPath)
                    req.flash('error','El archivo que se subio no es .zip o .7z, intentelo de nuevo');
                    res.redirect('back');
                } catch (err) {
                    console.log(err);
                    req.flash('error','Ocurrio un problema tratando de borrar el archivo invalido');
                    res.redirect('back');
                    break;
                }
            }

            //Si el archivo es valido se intenta descomprimir las imagenes
            fileName = path.basename(file);

            //Se define exactamente la direccion del archivo a descomprimir
            const zipfile = './public/uploads/'+params.comicName+'/capitulo-'+bodynumber+'/'+fileName;

            //haciendo uso del modulo Node Stream Zip se descomprime el archivo
            const zip = new StreamZip.async({file: zipfile})

            const count = await zip.extract(null,`./public/uploads/${params.comicName}/capitulo-${bodynumber}`)
            console.log(`Extracted ${count} entries`);
            zip.on('entry', entry => {
                console.log(`Read entry ${entry.name}`);
            });
            await zip.close();

            //Una vez se han extraido los archivos se elimina el paquete comprimido
            fs.unlinkSync(zipfile);
        };

        //Posteriormente se verifica que los archivos extraidos sean validos
        const allPages = fs.readdirSync(dirPath);

        for (const page of allPages) {
            //Esto revisa cada uno de los archivos extraidos
            if (path.extname(page) !== '.jpg' && path.extname(page) !== '.png' && path.extname(page) !== '.jpeg') {
                //Si uno solo de los archivos no es valido se eliminan todos por seguridad y se devuelve un error
                for (const page of allPages) {
                    fs.unlinkSync(page)
                }
                fs.rmdirSync(chapterPages)
                req.flash('error','Oops, parece que subiste imagenes invalidas, por favor asegurate que todas tengan un formato permitido, jpg/jpeg/png.')
                res.redirect('back');
                throw "Los archivos dentro del zip no eran imagenes validas"
            }
        };

        //se busca en la bdd el comic que se eligio para tomar su Id que debe ser asignado al capitulo
        let comic = await models.ComicEntry.findOne({
            where:{
                comicName: params.comicName
            }
        })
        comic = comic.dataValues

        const chapter = await models.ChapterEntry.create({
            chapterTitle: req.body.titleChapter,
            chapterNumber: req.body.numberChapter,
            comic_id: comic.id}
        );
        req.flash('success','Capitulo subido con exito');
        res.redirect('../comic/upload');

    } catch (err) {
        //Si Hubo un problema se elimina todo el directorio del capitulo por seguridad
        console.log(err);
        req.flash('error','Error. No se pudo subir el capitulo, intentelo de nuevo')


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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
    }
    const comicId = req.params.comicId
    let uploader = false;


    const comicEntry = await models.ComicEntry.findByPk(comicId)

    let comic = comicEntry.dataValues;

    if(comic.comicStatus.includes("-")) comic.comicStatus = comic.comicStatus.replace("-"," ")
    if(comic.comicName.includes("-")) comic.comicName = comic.comicName.replaceAll("-"," ")
    if(comic.comicCategories.includes("-")) comic.comicCategories = comic.comicCategories.replaceAll("-"," ")

    if (user) {
        if (user.id === comic.comicUploader_id) {
            uploader = true
        }
    }

    let chapters = await models.ChapterEntry.findAll({
        where:{
            comic_id: comic.id
        },
        order: [['chapterNumber','ASC']]
    })

    let uploaderData = await models.UserEntry.findByPk(comic.comicUploader_id)
    uploaderData = uploaderData.dataValues;

    for (let i = 0; i < chapters.length; i++) {
        chapters[i] = chapters[i].dataValues;
    }

    let categories = comic.comicCategories.split(',');
    categories.shift();

    let hasLiked = false;

    let userLike;
    if (user) {
        userLike = await models.likeEntry.findOne({
            where: {
                user_id: user.id,
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

    console.log('liked? :>> ', hasLiked);

    res.render('./comic/profile',{ uploaderData:uploaderData,hasLiked:hasLiked, likes:likes, isUploader: uploader, comic:comic, categories: categories, chapters:chapters ,title: comic.comicName, user:user, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
}

const read_get = async (req, res) =>{

    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /read:>> ', user);
    }

    let settings;
    const params = req.params;

    //Se busca el comic
    let Comic = await models.ComicEntry.findOne({
        where:{
            id: params.comicId
        }
    })
    Comic = Comic.dataValues

    //Luego se busca el capitulo especifico
    let chapter = await models.ChapterEntry.findOne({
        where: {
            comic_id: params.comicId,
            chapterNumber: params.chapter
        }
    })
    chapter = chapter.dataValues;

    //Se selecciona el directorio del capitulo, y se toma la cantidad de paginas, al igual que la cantidad de paginas
    const dirPath = "./public/uploads/"+Comic.comicName+"/capitulo-"+params.chapter;

    const files = fs.readdirSync(dirPath);

    const amountPages = files.length;

    const title = 'Leer '+Comic.comicName+' - '+params.chapter;

    const chapterPath = `/uploads/${Comic.comicName}/capitulo-${params.chapter}`
    let currentPage = parseInt(params.page);

    //Cada vez que se cambia pagina se calcula la siguiente y anterior para los links
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

    //Se definen los link para ser usados en la lectura, para cambiar de pagina
    const currentLink = `/read/${Comic.id}/${params.chapter}/${currentPage}`
    const nextPage = `/read/${Comic.id}/${params.chapter}/${next}`
    const prevPage = `/read/${Comic.id}/${params.chapter}/${prev}`

    //Se consiguen los comentarios para mostrar debajo de cada capitulo
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

    //Si esta loggeado se buscan sus configuraciones para aplicar automaticamente
    if (user) {
        let Setts = await models.SettingsEntry.findAll({
            where: {
                user_id: user.id,
            },
            order: [['createdAt','ASC']]
        })

        for (let i = 0; i < Setts.length; i++) {
            Setts[i] = Setts[i].dataValues;
        }
        settings = {
            pageTurnDirection: Setts[0].value,
            jumpOnPageTurn: Setts[1].value,
            filterOnOff: Setts[2].value,
            colorFilter: Setts[3].value,
        };
        console.log('settings :>> ', settings);
    }

    res.render('comic/read',{title: title, user:user, settings:settings, comic:Comic, chapter:chapter, chapterPath:chapterPath, files:files, amountPages:amountPages, currentPage:currentPage, prevPage:prevPage, nextPage:nextPage, currentLink:currentLink, comments:comments, Url:Url,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const read_post = async (req, res) =>{
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /read post:>> ', user);
    }
    params = req.params

    //Esta seccion se encargaa de los comentarios

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

    //Se toman los id del comic y el capitulo para linkear al comentario y luego mostrarlo
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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
    }
    console.log('username :>> ', user.username);
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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
    }

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
        req.flash('error','Parece que no esta autorizado para borrar este comic, como llegaste hasta aqui?');
        res.redirect('/');
        return;
    }

    if(!req.body.confirmComicDelete){
        req.flash('error','Debe confirmar con su contraseña para borrar comics');
        res.redirect('back');
        return;
    }

    if (user.role === 1) {
        if (!helpers.matchPassword(req.body.confirmComicDelete, user.password)) {
            req.flash('error','Contraseña incorrecta');
            res.redirect('back');
            return;
        }
    }else{
        if (!helpers.matchPassword(req.body.confirmComicDelete, uploaderData.password)) {
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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
    }

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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
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
    let user; if (await req.user) {
        await req.user.then( e => {user = e[0].dataValues} );
        console.log('user en /profile:>> ', user);
    }

    let commentId = req.params.commentId;

    let comment = await models.CommentEntry.findByPk(commentId);

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
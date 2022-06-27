const fs = require('fs');
const path = require('path');
const pool = require('../database');
const StreamZip = require('node-stream-zip');
const { use } = require('passport');
const models = require('../models/models');

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
            writer = writer.replace(" ","-")
        }
        //Eliminando espacios en el nombre del comic si los hay para evitar problemas de lectura con el programa
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = req.body.comicName.replace(" ","-");
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
    if(req.user){
        await req.user.then(e => {
            user = e[0];
        })
    }

    const comicEntry = await models.ComicEntry.findOne({
        where:{
            id: comicId
        }
    })

    const comic = comicEntry.dataValues;


    if (user) {
        if (user.dataValues.id === comic.comicUploader_id) {
            uploader = true
        }
    }

    const chapterArr = await models.ChapterEntry.findAll({
        where:{
            comic_id: comic.id
        }
    })

    let chapters = []

    for (const chapter of chapterArr) {
        chapters.push(chapter.dataValues);
    }

    let categories = comic.comicCategories.split(',');
    categories.shift()

    res.render('./comic/profile',{ isUploader: uploader, comic:comic, categories: categories, chapters:chapters ,title: comic.comicName, user:user, success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
}

const read_get = async (req, res) =>{

    let user; if (req.user) await req.user.then( e => {user = e[0]} );
    const params = req.params;
    console.log(params);

    let Comic = await models.ComicEntry.findAll({
        where:{
            id: params.comicId
        }
    })
    Comic = Comic[0].dataValues
    console.log('el comic: >>',Comic);

    let chapters = await models.ChapterEntry.findAll({
        where: {
            comic_id: params.comicId,
            chapterNumber: params.chapter
        }
    })
    chapters = chapters[0].dataValues;
    console.log('chapters:>> ',chapters);

    const dirPath = "./public/uploads/"+Comic.comicName+"/capitulo-"+params.chapter;
    console.log('dirPath :>> ', dirPath);

    const files = fs.readdirSync(dirPath);
    console.log('files :>> ', files);

    const amountPages = files.length;
    console.log('Amount of pages :>> ', amountPages);

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
            chapter_id: chapters.id
        }
    })

    for (let i = 0; i < comments.length; i++) {
        comments[i] = comments[i].dataValues;
        let user = await models.UserEntry.findByPk(comments[i].user_id);
        comments[i].username = user.username;
    }

    console.log('commentarios: >>',comments);

    const Url =  req.originalUrl;

    console.log(Url);

    res.render('comic/read',{title: title, user:user, comic:Comic, chapters:chapters, chapterPath:chapterPath, files:files, amountPages:amountPages, currentPage:currentPage, prevPage:prevPage, nextPage:nextPage, currentLink:currentLink, comments:comments, Url:Url})
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

    console.log('Comment :>> ', comment.dataValues);

    res.redirect('back')
}

const edit_comic_get = async (req, res) => {

    let comic = req.params.comic
    let uploader = req.params.uploader
    let tmp = await req.user
    let user = tmp[0]

    if (user.name !== uploader) {
        req.flash('error','Error. User not allowed to edit');
        res.redirect('/index');
        return;
    }

    if (user.name == uploader) {
        res.render('comic/editComic', {title: 'Edit Comic Entry',uploader:uploader,comic:comic, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
    }
}

const edit_comic_post = async (req, res) =>{

    let comicName = req.params.comic
    let user;
    let writer;
    let genresObj = [];
    let chapters = {};
    let comic = {};


    await req.user.then(e => {
        user = e[0];
    })

    if (req.body.comicName){
        let comicName = req.body.comicName;
        comic.comicName = comicName
        genresObj.genresComic = comicName
        chapters.chaptersComic = comicName
        console.log(comic.comicName);
    }
    if (req.body.comicDescription){
        let comicDescription = req.body.comicDescription;
        comic.comicDescription = comicDescription
        console.log(comic.comicDescription);
    }
    if (req.body.comicSchedule){
        let comicSchedule = req.body.comicSchedule;
        comic.comicSchedule = comicSchedule
        console.log(comic.comicSchedule);
    }
    if (req.body.comicStart){
        let comicStart = req.body.comicStart;
        comic.comicStart = comicStart
        console.log(comic.comicStart);
    }
    if (req.body.comicStatus){
        let comicStatus = req.body.comicStatus;
        comic.comicStatus = comicStatus
        console.log(comic.comicStatus);
    }

    if (req.body.comicOgWriter) {
        comic.comicWriter = req.body.comicOgWriter;
        console.log(writer);
    }

    console.log(comic);

    if(req.body.selectedCats){
        genresObj.genresNames = req.body.selectedCats;
    }

    console.log(genresObj);

    pool.query('USE tesis');
    pool.query('UPDATE comics SET ? WHERE comicName = ?',[comic, comicName]);
    pool.query('USE tesis');
    pool.query('UPDATE genres SET ? WHERE genresComic = ?',[genresObj,comicName]);
    pool.query('USE tesis');
    pool.query('UPDATE chapters SET ? WHERE chapterComic = ?',[chapters,comicName]);
    res.redirect('/comic/profile/'+comic.comicName);

}

const delete_comic_get = async (req, res) => {

    let comic = req.params.comic
    let uploader = req.params.uploader
    let tmp = await req.user
    let user = tmp[0]

    if (user.name !== uploader) {
        req.flash('error','Error. User not allowed to delete');
        res.redirect('/index');
        return;
    }

    if (user.name === uploader) {

        if (comic.includes("-")) {
            comic = comic.replaceAll("-"," ")
        }

        pool.query('USE tesis');
        let theComic = await pool.query('SELECT * FROM comics WHERE comicName = ?',[comic]);

        let delPath = await '/public/uploads/'+uploader+'/'+theComic[0].comicOgWriter
        try {
            fs.unlinkSync(delPath);
        } catch (err) {
            console.log(err);
        }

        pool.query('USE tesis')<
        pool.query('DELETE FROM comics WHERE comicName = ?',[comic])
        pool.query('USE tesis')<
        pool.query('DELETE FROM chapters WHERE chapterComic = ?',[comic])
        pool.query('USE tesis')<
        pool.query('DELETE FROM comics WHERE genresComic = ?',[comic])

        req.flash('success','Comic deleted');
        res.redirect('../');
    }



}

const delete_chapter_get = async (req, res) => {

    let comic = req.params.comic
    let uploader = req.params.uploader
    let chap = req.params.chapter
    let tmp = await req.user
    let user = tmp[0]

    console.log(req.params);

    if (comic.includes("-")) {
        comic = comic.replaceAll("-"," ")
    }

    if (user.name !== uploader) {
        req.flash('error','Error. User not allowed to delete');
        res.redirect('/index');
        return;
    }

    if (user.name === uploader) {

        console.log(comic);
        pool.query('USE tesis');
        let theComic = await pool.query('SELECT * FROM comics WHERE comicName = ?',[comic]);
        console.log(theComic);

        let delPath = await '/public/uploads/'+uploader+'/'+theComic[0].comicOgWriter+"/"+chap

        let chapN = chap.slice(-1);

        console.log(comic,delPath,chap,chapN);


        pool.query('USE tesis')
        pool.query('DELETE FROM chapters WHERE chapterComic = ? AND chapterNumber = ?',[comic,chapN]);

        try {
            fs.unlinkSync(delPath);
        } catch (err) {
            console.log(err);
        }
        req.flash('success','"Chapter deleted');
        res.redirect('../');
    }

}

const comments = async (req, res) => {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    console.log(fullUrl);
}

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
    delete_comic_get,
    delete_chapter_get,

}
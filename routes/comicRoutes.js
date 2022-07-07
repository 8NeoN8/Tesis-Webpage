const express = require('express');
const controller = require('../controllers/comicController');
const  {isLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const models = require('../models/models');
let user;


//Definiendo procesos de Multer, el encargado de subir archivos al servidor
//En este caso, la imagen de perfil del comic que se introduce en la creacion del comic
const storageComic = multer.diskStorage({
    destination:async function(req,response,done){
        //Se toma el nombre ingresado y se eliminan los espacios en blanco para la creacion del directorio
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = comicName.replaceAll(" ","-");
        }
        if (comicName.includes(":")) {
            comicName = comicName.replaceAll(":","_");
        }
        //Se verifica que no exista un comic con ese nombre previamente y si es el caso de que existe se devuelve un error
        //En caso contrario se crea el directorio
        if(fs.existsSync(path.join(__dirname,'..','/public/uploads/',comicName))){
            done(new Error("Ya existe un comic con ese nombre"))
        }else{
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/',comicName))
            done(null,'./public/uploads/'+comicName)
        }
    },
    filename:async function (req,file,done){
        //Aqui se denomina el nombre de la imagen, en el formato (Nombre de comic)-(imagen de cubierta).(jpg, jpeg, png)
        //Se toma el nombre ingresado y se eliminan los espacios en blanco para la creacion del nombre de la imagen
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = comicName.replaceAll(" ","-");
        }
        if (comicName.includes(":")) {
            comicName = comicName.replaceAll(":","_");
        }
        //Si la imagen no tiene una extension valida se devuelve un error
        if (!path.extname(file.originalname)) {
            done(new Error("El archivo no es una imagen valida"))
        }
        done(null, comicName+'-CoverImage'+path.extname(file.originalname))
    }
})

//Aqui se define la variable que hace el proceso de subida que usara el navegador
const uploadComic = multer({storage:storageComic}).single('CoverImage');


//Definiendo procesos de Multer, el encargado de subir archivos al servidor
//En este caso, el archivo del capitulo del comic seleccionado
const storageChapter = multer.diskStorage({
    destination: async function(req,res,done){
        await req.user.then(e => {
            user = e[0];
        })
        let comicName = req.params.comicName;
        //Aqui se define el directorio destino para las imagenes del capitulo
        let pathT = path.join(__dirname,'..','/public/uploads/',comicName,'capitulo-'+req.body.numberChapter)

        //Si no existe el directorio, se crea, si existe se devuelve un error indicando que ya existe el capitulo
        if(!fs.existsSync(pathT)){
            fs.mkdirSync(pathT);
            done(null,'./public/uploads/'+comicName+'/capitulo-'+req.body.numberChapter);
        }else{
            done(new Error("Ya existe ese capitulo"));
        }
        //Aqui ya se establece la direccion donde se guardara el archivo
        done(null,'./public/uploads/'+comicName+'/capitulo-'+req.body.numberChapter)
    },
    filename: async function (req,file,done){
        //Dando nombre al archivo, en este caso, capitulo-(numero ingresado)
        done(null, 'capitulo-'+req.body.numberChapter+path.extname(file.originalname));
    }
})

//Aqui se define la variable que hace el proceso de subida que usara el navegador
const uploadChapter = multer({storage:storageChapter,
    fileFilter: async (req,file,done) => {
        //Se aplica un filtro para que solo acepte archivos zip, debido a limitaciones tecnicas
        var ext = path.extname(file.originalname);
        if(ext !== '.zip' && ext !== '.7z') {
            done(new Error('Solo se pueden subir archivos Zip'));
        }
        done(null,true);
    },
    limits:{
        //Se limita el tamaño del archivo a un maximo de 200mb para evitar tiempos de subida muy altos o realentizacion del server
        fileSize: 2e+8
    }
}).single('chapterFile');


const storageNewImage = multer.diskStorage({
    destination:async function(req,response,done){

        let comic = await models.ComicEntry.findByPk(req.params.comicId);
        let comicName = comic.comicName;
        let fileFind = undefined;

        let files = fs.readdirSync(`./public/uploads/${comicName}`);

        for (const file of files) {
            if (path.extname(file) && (path.extname(file) === '.png' || path.extname(file) === '.jpeg' || path.extname(file) === '.jpg') && (file.includes(`${comicName}-CoverImage`))) {
                fileFind = file;
            }
        }
        if (fileFind) {
            fs.unlinkSync(`./public/uploads/${comicName}/${fileFind}`);
        }
        done(null,'./public/uploads/'+comicName)
    },
    filename:async function (req,file,done){
        let comic = await models.ComicEntry.findByPk(req.params.comicId);
        let comicName = comic.comicName;
        let imageName = `${comicName}-CoverImage${path.extname(file.originalname)}`;
        let newCoverPath = `/uploads/${comicName}/${imageName}`;
        await models.ComicEntry.update({comicCoverPath: newCoverPath},{
            where: {
                id: comic.id
            }
        })
        done(null, imageName)
    }
})

const uploadNewImage = multer({storage:storageNewImage}).single('CoverImage');



//Enrutamiento de la creacion del comic
router.get('/create', isLoggedIn, controller.create_get);

router.post('/create', isLoggedIn, function(req, res, next){
    uploadComic(req, res, err =>{
        //Si resulta un error se devuelve un mensaje con las posibles causas
        if (err){
            console.log(err);
            req.flash('error','Ya existe un comic con ese nombre, o el archivo no es valido');
            res.redirect('back')
            return
        }
        next()
    })
}, controller.create_post);

router.get('/upload', isLoggedIn, controller.upload_get);

router.get('/upload/:uploaderId/:comicId', isLoggedIn, controller.upload_get)

router.post('/upload/:uploaderId/:comicId', isLoggedIn, function(req, res, next){
    uploadChapter(req, res, err =>{
        if (err){
            //Si resulta un error se devuelve un mensaje con las posibles causas
            console.log(err);
            req.flash('error','Ya existe ese capitulo o el archivo a subir no es valido');
            res.redirect('back')
            return
        }
        next()
    })
}, controller.upload_post);

router.post('/delete/:uploaderId/:comicId/', isLoggedIn ,controller.delete_comic_post)

router.get('/edit/:uploaderId/:comicId/', isLoggedIn, controller.edit_comic_get)

router.post('/edit/:uploaderId/:comicId/', isLoggedIn,function(req, res, next){
    uploadNewImage(req, res, err =>{
        if (err){
            console.log(err);
            req.flash('error','Hubo un problema al subir la nueva imagen');
            res.redirect('../comic/create')
            return
        }
        next()
    })
}, controller.edit_comic_post)

router.get('/delete/:uploaderId/:comicId/:chapterId', isLoggedIn,controller.delete_chapter_get)

router.post('/like/:comicId/:userId/:hasLiked',isLoggedIn, controller.likes_post)

router.post('/deleteComment/:commentId/',isLoggedIn, controller.deleteComment_post)

module.exports = router;
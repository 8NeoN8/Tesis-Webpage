const express = require('express');
const controller = require('../controllers/comicController');
const  {isLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
let user;


//Definiendo procesos de Multer, el encargado de subir archivos al servidor
//En este caso, la imagen de perfil del comic
const storageComic = multer.diskStorage({
    destination:async function(req,response,done){
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = req.body.comicName.replace(" ","-");
        }
        if(fs.existsSync(path.join(__dirname,'..','/public/uploads/',comicName))){
            done(new Error("Ya existe un comic con ese nombre"))
        }else{
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/',comicName))
            done(null,'./public/uploads/'+comicName)
        }
    },
    filename:async function (req,file,done){
        //Aqui se denomina el nombre de la imagen, en el formato (Nombre de comic)-CoverImage.(jpg, jpeg, png)
        let comicName = req.body.comicName;
        if (comicName.includes(" ")) {
            comicName = req.body.comicName.replace(" ","-");
        }
        done(null, comicName+'-CoverImage'+path.extname(file.originalname))
    }
})

const uploadComic = multer({storage:storageComic}).single('CoverImage');

const storageChapter = multer.diskStorage({
    destination: async function(req,res,done){
        await req.user.then(e => {
            user = e[0];
        })
        let comicName = req.params.comicName;
        let pathT = path.join(__dirname,'..','/public/uploads/',comicName,'capitulo-'+req.body.numberChapter)
        console.log(pathT);
        if(!fs.existsSync(pathT)){
            fs.mkdirSync(pathT);
            done(null,'./public/uploads/'+comicName+'/capitulo-'+req.body.numberChapter);
        }else{
            done(new Error("Ya existe ese capitulo"));
        }
        done(null,'./public/uploads/'+comicName+'/capitulo-'+req.body.numberChapter)
    },
    filename: async function (req,file,done){
        done(null, 'capitulo-'+req.body.numberChapter+path.extname(file.originalname));
    }
})

const uploadChapter = multer({storage:storageChapter,
    fileFilter: async (req,file,done) => {
        done(null,true);
    },
    limits:{
        fileSize: 2e+8
    }
}).single('chapterFile');


//*Done
router.get('/create', isLoggedIn, controller.create_get);
//*Done
router.post('/create', isLoggedIn, function(req, res, next){
    uploadComic(req, res, err =>{
        if (err){
            console.log(err);
            req.flash('error','Ya existe un comic con ese nombre, no pueden haber comics con el mismo nombre');
            res.redirect('../comic/create')
            return
        }
        next()
    })}, controller.create_post);
//*Done
router.get('/upload', isLoggedIn, controller.upload_get);
//*Done
router.get('/upload/:comicUploader/:comicName', isLoggedIn, controller.upload_get)
//*Done
router.post('/upload/:comicUploader/:comicName', isLoggedIn, function(req, res, next){
    uploadChapter(req, res, err =>{
        if (err){
            console.log(err);
            req.flash('error','Ya existe ese capitulo, debe borrarlo primero si quiere reemplazarlo');
            res.redirect('../comic/upload')
            return
        }
        next()
    })}, controller.upload_post);
//*Done
router.get('/delete/:uploaderId/:comicId/', isLoggedIn,controller.delete_comic_get)
//*Done
router.get('/edit/:uploaderId/:comicId/', isLoggedIn, controller.edit_comic_get)
//*Done
router.post('/edit/:uploader/:comicId/', isLoggedIn, controller.edit_comic_post)

//TODO
//router.get('/delete/:uploader/:comic/:chapter', uploadChapter, isLoggedIn,controller.delete_chapter_get)

module.exports = router;
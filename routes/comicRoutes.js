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
router.post('/delete/:uploaderId/:comicId/', isLoggedIn ,controller.delete_comic_post)
//*Done
router.get('/edit/:uploaderId/:comicId/', isLoggedIn, controller.edit_comic_get)
//*Done
router.post('/edit/:uploaderId/:comicId/', isLoggedIn,function(req, res, next){
    uploadNewImage(req, res, err =>{
        if (err){
            console.log(err);
            req.flash('error','Hubo un problema al subir la nueva imagen');
            res.redirect('../comic/create')
            return
        }
        next()
    })}, controller.edit_comic_post)
//*Done
router.get('/delete/:uploaderId/:comicId/:chapterId', isLoggedIn,controller.delete_chapter_get)
//*Done
router.post('/like/:comicId/:userId',isLoggedIn, controller.likes_post)

//TODO
router.post('/deleteComment/:commentId/',isLoggedIn, controller.deleteComment_post)

module.exports = router;
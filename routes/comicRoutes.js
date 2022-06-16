const express = require('express');
const controller = require('../controllers/comicController');
const  {isLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const path = require('path');
let user;

const storageComic = multer.diskStorage({
    destination: async function(req,res,done){
        await req.user.then(e => {
            user = e[0];
        })
        done(null,'./public/uploads/'+user.name)
    },
    filename: async function (req,file,done){
        fileName = await file.originalname;
        done(null, 'CoverImage-'+req.body.comicName+path.extname(file.originalname))
    }
})

const uploadComic = multer({storage:storageComic});

const storageChapter = multer.diskStorage({
    destination: async function(req,res,done){
        await req.user.then(e => {
            user = e[0];
        })
        done(null,'./public/uploads/'+req.params.writer)
    },
    filename: async function (req,file,done){
        done(null, 'chap'+req.body.numberChapter+path.extname(file.originalname));
    }
})

const uploadChapter = multer({storage:storageChapter,
    fileFilter: async (req,file,done) => {
        done(null,true)
    },
    limits:{
        fileSize: 2e+8
    }
})


//*Done
router.get('/create', isLoggedIn, controller.create_get);
//*Done
router.post('/create', isLoggedIn, controller.userFolder, uploadComic.single('CoverImage'), controller.create_post);
//*Done
router.get('/upload', isLoggedIn, controller.upload_get);
//*done
router.get('/upload/:writer/:comic', isLoggedIn, controller.upload_get)
//*Done
router.post('/upload/:writer/:comic', isLoggedIn, uploadChapter.single('chapterFile'), controller.upload_post)
//*Done
router.get('/search', controller.search_get);
//*Done
router.post('/search', controller.search_post);
//*Done
router.get('/profile/:comicName', controller.profile_get)

//TODO
router.get('/read/:comicName/:chapter/:page',controller.read_get)

//*Done
router.get('/delete/:uploader/:comic/', isLoggedIn,controller.delete_comic_get)
//*Done
router.get('/edit/:uploader/:comic/', isLoggedIn, controller.edit_comic_get)
//*Done
router.post('/edit/:uploader/:comic/', isLoggedIn, controller.edit_comic_post)

//TODO
router.get('/delete/:uploader/:comic/:chapter', uploadChapter.single('chapterFile'), isLoggedIn,controller.delete_chapter_get)

module.exports = router;
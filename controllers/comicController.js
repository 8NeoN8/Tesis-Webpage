const fs = require('fs');
const path = require('path');
const pool = require('../database');
const StreamZip = require('node-stream-zip');
const { use } = require('passport');

const create_get = (req, res) => {
    res.render('comic/create', {tittle: 'Create Comic Entry',success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const create_post =  async (req, res) => {
    try {

        let user;
        await req.user.then(e => {
            user = e[0];
        })
        let fileName;
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        let yyyy = today.getFullYear();
        today = yyyy + '/' + mm + '/' + dd;
        let writer;
        let catAmount;
        let cats = [];
        let temp = false;
        let unspacedWriter;

        if (req.body.comicOgWriter) {
            writer = req.body.comicOgWriter
            console.log(writer);
        }else writer = user.name

        console.log("THE WRITER ", writer);

        /* if(writer.includes(" ")){
            unspacedWriter = writer.replace(" ","-")
        }else unspacedWriter = writer */

        if (req.body.isWriter) {
            console.log("it is not the writer", req.body.isWriter);
        } else console.log("it is the writer");

        /* console.log(req.body.selectedCats);
        let genres = req.body.selectedCats.split(',')
        genres = genres.slice(1,genres.length+1)
        console.log(genres); */


        let tmpDirPath = './public/uploads/'+user.name
        let dirPath = './public/uploads/'+user.name

        if (req.body.isWriter) {
            dirPath = './public/uploads/'+writer
        }

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(path.join(__dirname,'..','/public/uploads/',writer), err =>{
                if(err) req.flash('error','There was a problem creating comic directory'), res.redirect('./comic/create')
            })
        }

        const tmpFiles = fs.readdirSync(tmpDirPath);
        const files = fs.readdirSync(dirPath);

        if (req.body.comicStart) {
            startDate = req.body.comicStart;
        } else {
            startDate = today;
        }

        for (const file of files) {
            if (file) {
                if (file.toLowerCase().includes(("coverImage-"+req.body.comicName).toLowerCase())){
                    fileName = file;
                    break;
                }
            }
        }

        if (req.body.isWriter) {
            for (const file of tmpFiles) {
                if (file) {
                    if (file.toLowerCase().includes(("coverImage-"+req.body.comicName).toLowerCase())){
                        fileName = file;
                        break;
                    }
                }
            }
        }

        const chaptersPath = '/public/uploads/'+writer+'/'+req.body.comicName

        if (!fs.existsSync("."+chaptersPath)){
            fs.mkdirSync(("."+chaptersPath),err=>console.log(err))
        }

        let oldPath = await '/public/uploads/'+writer+'/'+fileName
        console.log(oldPath);
        let tmpPath = await '/public/uploads/'+user.name+'/'+fileName
        console.log(tmpPath);

        let newPath = await '/public/uploads/'+writer+'/'+req.body.comicName+'/'+fileName
        console.log(newPath);

        if (fs.existsSync(oldPath)) {
            await fs.renameSync(path.join(__dirname,"..",oldPath), path.join(__dirname,"..",newPath), err => console.log(err))
        }else await fs.renameSync(path.join(__dirname,"..",tmpPath), path.join(__dirname,"..",newPath), err => console.log(err))

        const comic = {
            comicName: req.body.comicName,
            comicOgName: req.body.comicName,
            comicDescription: req.body.comicDescription,
            comicSchedule: req.body.comicSchedule,
            comicStart: startDate,
            comicStatus: req.body.comicStatus,
            comicCoverPath: '/uploads/'+writer+'/'+req.body.comicName+'/'+fileName,
            comicWriter:writer,
            comicOgWriter:writer,
            comicUploader: user.name,
            comicAdded: today,
            comicUpdated: today,
            userID: user.id,
        }

        const genres = {
            genresNames: req.body.selectedCats,
            genresComic: comic.comicName
        }

        await pool.query('USE tesis;');
        await pool.query('INSERT INTO comics set ?',[comic])

        await pool.query('INSERT INTO genres set ?',[genres])
            .then(req.flash('success','Comic registered successfuly'))
            .then(res.redirect('../'))

    } catch (err) {
        req.flash('error','Error. Could not create Comic')
        console.log(err);
        res.redirect('../comic/create')
    }
}

const upload_get = async (req, res) => {
    let params = await req.params
    let user = await req.user
    let comicSelected = [];
    let comics = [];

    await pool.query('USE tesis')
    comics = await pool.query('SELECT * FROM comics WHERE comicUploader = ?',[user[0].name])

    if(Object.keys(params).length > 0){
        comicSelected = await pool.query('SELECT * FROM comics WHERE comicOgWriter = ?',[params.writer])
        if (comicSelected.length > 0) {
            res.render('comic/chooseComic', {tittle: 'Upload Comic Chapter',user:user, comics:comics, comicSelected:comicSelected,success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
        }else{
            req.flash('error','Error. No comic found')
            res.redirect('../')
        }

    }else{
        res.render('comic/chooseComic', {tittle: 'Upload Comic Chapter',user:user, comics:comics, comicSelected: comicSelected,success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
    }

}

const upload_post = async (req, res) => {
    try {
        let user;
        await req.user.then(e => {
            user = e[0];
        })
        let params  = req.params;

        let dirPath = './public/uploads/'+params.writer;
        let chaptersPath = '/public/uploads/'+params.writer+'/'+params.comic;
        let fileName;
        let bodynumber = req.body.numberChapter;
        let bodytittle = req.body.tittleChapter;
        let bodycomic = params.comic
        let filePath;
        let oldPath;
        let newPath;

        const files = fs.readdirSync(dirPath);


        for (const file of files) {
            if (!path.extname(file)) {console.log("no extension?"); continue}

            filePath = dirPath+'/'+path.basename(file)
            console.log("antes del if de extension");

            if (path.extname(file) !== ".zip" && path.extname(file) !== ".7z") {
                console.log("dentro del if");
                try {
                    fs.unlinkSync(filePath)
                    console.log("se borro por se invalido");
                    req.flash('error','The file is not a .zip or .7z')
                    res.redirect('../'+params.writer+'/'+params.comic)
                } catch (err) {
                    console.log(err);
                    console.log("error random");
                    req.flash('error','A problem ocurred when trying to delete unvalid chapter file')
                    res.redirect('../'+params.writer+'/'+params.comic)
                    break
                }
            }

            fileName = path.basename(file);

            console.log("es un zip valido");

            if (!fs.existsSync("."+chaptersPath)){
                req.flash('error','Error. The selected comic does not exist, please create it first')
                rq.redirect('../../create')
            } else console.log("existe el comic");

            oldPath = await '/public/uploads/'+params.writer+'/'+fileName
            newPath = await '/public/uploads/'+params.writer+'/'+params.comic+'/'+'chap'+bodynumber+path.extname(file)

            if (fs.existsSync("./public/uploads/"+params.writer+"/"+bodycomic+"/chap"+bodynumber)){
                console.log("No esta el archivo, se entiende que se borro pór no ser valido");
                req.flash('error','Error. The chapter is already created, please delete it before reuploading');
                res.redirect('../../upload/');
                return
            }

            await fs.renameSync(path.join(__dirname,"..",oldPath), path.join(__dirname,"..",newPath), err => console.log(err))

            console.log("se movio el capitulo a la carpeta del comic");

            if (await fs.existsSync("."+newPath)) {
                console.log("el capitulo si esta dentro del comic");
            }

            const eachfile = "."+newPath

            console.log(eachfile);

            const zip = new StreamZip.async({file: eachfile})

            if(!fs.existsSync("./public/uploads/"+params.writer+"/"+bodycomic+"/chap"+bodynumber)){
                fs.mkdirSync("./public/uploads/"+params.writer+"/"+bodycomic+"/chap"+bodynumber);
            }

            const count = await zip.extract(null,"./public/uploads/"+params.writer+"/"+bodycomic+"/chap"+bodynumber)
            console.log(`Extracted ${count} entries`);
            zip.on('entry', entry => {
                console.log(`Read entry ${entry.name}`);
            });

            await zip.close();
            fs.unlinkSync('.'+newPath)
        }


        chapterPages = './public/uploads/'+params.writer+'/'+params.comic+'/'+'chap'+bodynumber
        const allPages = fs.readdirSync(chapterPages)

        console.log(allPages);

        for (const page of allPages) {
            if (path.extname(page) !== '.jpg' && path.extname(page) !== '.png' && path.extname(page) !== '.jpeg') {

                fs.unlinkSync(chapterPages)
                req.flash('error','Error. One of the files in the zip file is not valid, please make all files valid images(jpeg, jpg, png)')
                res.redirect('../'+params.writer+'/'+params.comic);
            }
        }

        let chapterObj = {
            chapterTittle: req.body.tittleChapter,
            chapterNumber: req.body.numberChapter,
            chapterComic: params.comic
        }
        console.log(chapterObj);

        await pool.query('USE tesis');
        await pool.query('INSERT INTO chapters set ?',[chapterObj])
        req.flash('success','Chapter registered Successfully');
        res.redirect('../profile/params.comic')

        //await pool.query('SELECT * FROM chapters WHERE comicName = ?',[params.comic])

    } catch (err) {
        console.log(err);
        req.flash('error','Error. Something unexpected went wrong')
        res.redirect('../')
    }
}

const search_get = async (req, res) => {

    await pool.query('USE tesis');
    let comics = await pool.query('SELECT * FROM comics');

    if (await req.user) {
        let user;
        await req.user.then(e => {
            user = e[0];
            res.render('comic/search', {tittle: 'Search Comic', user:user, comics: comics,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
        })
        return
    }

    res.render('comic/search', {tittle: 'Search Comic', comics: comics,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const search_post = async (req, res) => {
    let user;
    if(req.user){
        await req.user.then(e => {
        user = e[0];
    })
    }
    let comicName = await req.body.comicSearch;
    //console.log(comicName);

    await pool.query('USE tesis');
    let comics = await pool.query('SELECT * FROM comics WHERE comicName = ?',[comicName]);
    if (comics.length<=0) {
        req.flash('error','No comic found');
        res.redirect('../search')
    }


    res.render('comic/search', {tittle: 'Search Comic', user:user, comics: comics ,success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
}

const profile_get = async (req,res) => {
    const params = req.params
    const comicN = params.comicName
    let user;
    if(req.user){
        await req.user.then(e => {
            user = e[0];
        })
    }
    let uploader = false;

    await pool.query('USE tesis');

    let comic = await pool.query("SELECT * FROM comics WHERE comicName = ?",[comicN])

    console.log(comicN);

    let chapterArr = await pool.query('SELECT * FROM chapters WHERE chapterComic = ?',[comicN])
    let genresString = await pool.query('SELECT * FROM genres WHERE genresComic = ?',[comicN])
    let fileNames = [];
    let fileArr = [];
    let genresArr = [];
    let chapterCount = 0;

    console.log(chapterArr);

    if (user) {
        if (user.name === comic[0].comicUploader) {
            uploader = true
        }
    }

    if (comic.length > 0) {
        //console.log(comic)

        let dirPath = './public/uploads/'+comic[0].comicOgWriter+'/'+comic[0].comicOgName

        if (!fs.existsSync(dirPath)) {
            req.flash('error','Error. The comic does not exist')
            res.redirect('../search')
        }

        const files = fs.readdirSync(dirPath);
        console.log(files);

        if (files.length > 0){
            for (let i = 0; i < files.length; i++) {
                if (!path.extname(files[i])){
                    fileNames[i] = path.basename(files[i]);
                    //console.log(fileNames[i],"uno por uno");
                }
            }

            fileArr = fileNames.filter(element => {
                if (Object.keys(element).length !== 0) {
                  return true;
                }
                return false;
            });
            chapterCount = files.length
            genresArr = JSON.stringify(genresString[0].genresNames);
            genresArr = genresArr.split(',');
            genresArr = genresArr.slice(1,genresArr.length+1)
            //console.log(chapterArr);
        }
    }
    res.render('./comic/profile',{comic:comic, isUploader: uploader, fileNames:fileArr, genres: genresArr, chapterArr:chapterArr , chapCount: chapterCount,tittle: comicN, user:user,success:req.flash('success'), error:req.flash('error'), message:req.flash('message')})
}

const userFolder = async (req, res,next) => {
    let user;
        await req.user.then(e => {
            user = e[0];
        })

    const dirPath = './public/uploads/'+user.name

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(path.join(__dirname,'..','/public/uploads/',user.name), err =>{
            if(err) console.log(err), res.send('problema al crear directorio')
        })
    }
    next();
}

const read_get = async (req, res) =>{

    let user; if(req.user) await req.user.then( e => {user = e[0]} )
    let params = req.params
    let chapterNumber = params.chapter
    let comicName = params.comicName
    let chapterPage = params.page
    let ext;

    await pool.query('USE tesis')
    let comic = await pool.query('SELECT * FROM comics WHERE comicOgName = ?',[comicName])


    let dirPath = "./public/uploads/"+comic[0].comicOgWriter+"/"+comic[0].comicOgName+"/"+chapterNumber
    let files = fs.readdirSync(dirPath);
    ext = files[0].split('.').pop();
    let pageAmout = files.length

    let chapter ={
        dirPath: "/uploads/"+comic[0].comicOgWriter+"/"+comic[0].comicOgName+"/"+chapterNumber,
        imagesUrl: "/uploads/"+comic[0].comicOgWriter+"/"+comic[0].comicOgName+"/"+chapterNumber+"/pag"+chapterPage+"."+ext,
        nextPrevLinks:"/comic/read"+"/"+comic[0].comicOgName+"/"+chapterNumber+"/",
        theFunnyGuy:"/uploads/"+comic[0].comicOgWriter+"/"+comic[0].comicOgName+"/"+chapterNumber+"/pag1"+"."+ext,
        files: files,
        chapterNumber: chapterNumber,
        currentPage: chapterPage,
        pageAmout: pageAmout,
        comicProfile: "/comic/profile/"+comic[0].comicOgName
    }
    console.log(chapter);
    let tittle = 'read '+comicName+' '+chapterNumber;

    res.render('comic/read', {tittle: tittle, user:user, chapter: chapter})
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
        res.render('comic/editComic', {tittle: 'Edit Comic Entry',uploader:uploader,comic:comic, success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
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
    search_get,
    search_post,
    profile_get,
    userFolder,
    read_get,
    edit_comic_get,
    edit_comic_post,
    delete_comic_get,
    delete_chapter_get,

}
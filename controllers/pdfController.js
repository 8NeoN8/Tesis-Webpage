const fs = require('fs');
const path = require('path');
const pool = require('../database');
const StreamZip = require('node-stream-zip');
const { use } = require('passport');
const models = require('../models/models');
const { nextTick } = require('process');
const helpers = require('../lib/helpers')
// requires
const PDFDocument = require("pdfkit-table");

let users;
let comics;
let comments;
let testObjectArray = [];

const UsersReport = async (req, res) => {
    testObjectArray = [];

    users = await models.UserEntry.findAll();
    for (let i = 0; i < users.length; i++) {
        users[i] = users[i].dataValues;

    }

    console.log('users[0].created :>> ', users[0].createdAt);

    comics = await models.ComicEntry.findAll();
    for (let i = 0; i < comics.length; i++) {
        comics[i] = comics[i].dataValues;

    }

    comments = await models.CommentEntry.findAll();
    for (let i = 0; i < comments.length; i++) {
        comments[i] = comments[i].dataValues;

    }

    for (let i = 0; i < users.length; i++) {
        let testObject = {
            options:{ fontSize: 13, separation: true},
            username:(users[i].username),
            email:(users[i].email),
            createdAt:(((users[i].createdAt).toJSON().split('T'))[0]),
        }
        testObjectArray.push(testObject);
    }

    console.log('testObjectArray :>> ', testObjectArray);


    // init document
    let doc = new PDFDocument({ margin: 30, size: 'A4' });
    // save document
    doc.pipe(fs.createWriteStream("./UserReport.pdf"));



    ;(async function createTable(){
        // table
        const table = {
            title: 'Reporte de Usuarios',
            subtitle:'Informacion basica de todos los usuarios Registrados',
            headers: [
                { label: "Nombre de Usuario", property: 'username', width: 150, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
                { label: "Email", property: 'email', width: 150, renderer: null, headerAlign:'center'},
                { label: "Fecha de registro", property: 'createdAt', width: 150, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
            ],
            datas: testObjectArray

        };

        // the magic (async/await)
        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              doc.font("Helvetica").fontSize(8);
              indexColumn === 0 && doc.addBackground(rectRow, 'blue', 0.15);
            },
          });
        // -- or --
        // doc.table(table).then(() => { doc.end() }).catch((err) => { })

        // if your run express.js server
        // to show PDF on navigator
        doc.pipe(res);

        // done!
        doc.end();
    })();
}

const ComicsReport = async (req, res) => {
    testObjectArray = [];

    users = await models.UserEntry.findAll();
    for (let i = 0; i < users.length; i++) {
        users[i] = users[i].dataValues;

    }

    comics = await models.ComicEntry.findAll();
    for (let i = 0; i < comics.length; i++) {
        comics[i] = comics[i].dataValues;

    }

    comments = await models.CommentEntry.findAll();
    for (let i = 0; i < comments.length; i++) {
        comments[i] = comments[i].dataValues;

    }

    for (let i = 0; i < comics.length; i++) {
        let uploader = await models.UserEntry.findByPk(comics[i].comicUploader_id)
        uploader = uploader.dataValues.username
        let chapters = await models.ChapterEntry.findAll({
            where: {
                comic_id: comics[i].id
            }
        })
        for (let i = 0; i < chapters.length; i++) {
            chapters[i] = chapters[i].dataValues;
        }
        console.log('chapters :>> ', chapters);
        if (chapters !== null) {
            chapters = chapters.length
        }else chapters = 0;
        let testObject = {
            options:{ fontSize: 13, separation: true},
            comicName:(comics[i].comicName),
            comicUploader:uploader,
            chapters: chapters,
            createdAt:(((comics[i].createdAt).toJSON().split('T'))[0]),
            updatedAt:(((comics[i].updatedAt).toJSON().split('T'))[0]),
        }
        testObjectArray.push(testObject);
    }

    console.log('testObjectArray :>> ', testObjectArray);


    // init document
    let doc = new PDFDocument({ margin: 30, size: 'A4' });
    // save document
    doc.pipe(fs.createWriteStream("./ComicsReport.pdf"));



    ;(async function createTable(){
        // table
        const table = {
            title: 'Reporte de Comic',
            subtitle:'Informacion basica de todos los comics Registrados',
            headers: [
                { label: "Nombre", property: 'comicName', width: 150, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
                { label: "Uploader", property: 'comicUploader', width: 100, renderer: null, headerAlign:'center'},
                { label: "Capitulos", property: 'chapters', width: 50, renderer: null, columnColor:'#00ff62', align:'center'},
                { label: "Fecha de registro", property: 'createdAt', width: 100, renderer: null, headerAlign:'center'},
                { label: "Ultima actualizacion", property: 'updatedAt', width: 100, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
            ],
            datas: testObjectArray

        };

        // the magic (async/await)
        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              doc.font("Helvetica").fontSize(8);
              indexColumn === 0 && doc.addBackground(rectRow, 'blue', 0.15);
            },
          });
        // -- or --
        // doc.table(table).then(() => { doc.end() }).catch((err) => { })

        // if your run express.js server
        // to show PDF on navigator
        doc.pipe(res);

        // done!
        doc.end();
    })();
}

const CommentsReport = async (req, res) => {
    testObjectArray = [];

    users = await models.UserEntry.findAll();
    for (let i = 0; i < users.length; i++) {
        users[i] = users[i].dataValues;

    }

    comics = await models.ComicEntry.findAll();
    for (let i = 0; i < comics.length; i++) {
        comics[i] = comics[i].dataValues;

    }

    comments = await models.CommentEntry.findAll();
    for (let i = 0; i < comments.length; i++) {
        comments[i] = comments[i].dataValues;

    }

    for (let i = 0; i < comments.length; i++) {

        let username = await models.UserEntry.findByPk(comments[i].user_id)
        username = username.dataValues.username
        let comic = await models.ComicEntry.findByPk(comments[i].comic_id)
        comic = comic.dataValues.comicName
        let chapter = await models.ChapterEntry.findByPk(comments[i].chapter_id)
        chapter = chapter.dataValues.chapterNumber

        let testObject = {
            options:{ fontSize: 13, separation: true},
            username: username,
            comic:comic,
            comment:(comments[i].commentText),
            chapter: chapter,
            createdAt:(((comments[i].createdAt).toJSON().split('T'))[0]),
            updatedAt:(((comments[i].updatedAt).toJSON().split('T'))[0]),
        }
        testObjectArray.push(testObject);
    }

    console.log('testObjectArray :>> ', testObjectArray);


    // init document
    let doc = new PDFDocument({ margin: 30, size: 'A4' });
    // save document
    doc.pipe(fs.createWriteStream("./ComicsReport.pdf"));



    ;(async function createTable(){
        // table
        const table = {
            title: 'Reporte de Comentarios',
            subtitle:'Informacion sobre los comentarios escritos en los capitulos de los comics',
            headers: [
                { label: "Nombre de usuario", property: 'username', width: 80, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
                { label: "Comentario", property: 'comment', width: 130, renderer: null, headerAlign:'center'},
                { label: "Comic", property: 'comic', width: 130, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
                { label: "Capitulo", property: 'chapter', width: 50, renderer: null, align:'center'},
                { label: "Fecha de ccreacion", property: 'createdAt', width: 60, renderer: null, columnColor:'#00ff62', headerAlign:'center'},
                { label: "Ultima actualizacion", property: 'updatedAt', width: 60, renderer: null, headerAlign:'center'},
            ],
            datas: testObjectArray

        };

        // the magic (async/await)
        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              doc.font("Helvetica").fontSize(8);
              indexColumn === 0 && doc.addBackground(rectRow, 'blue', 0.15);
            },
          });
        // -- or --
        // doc.table(table).then(() => { doc.end() }).catch((err) => { })

        // if your run express.js server
        // to show PDF on navigator
        doc.pipe(res);

        // done!
        doc.end();
    })();
}

module.exports = {
    UsersReport,
    ComicsReport,
    CommentsReport,
}
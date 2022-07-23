const express = require('express');
const controller = require('../controllers/pdfController');
const  {isLoggedIn} = require('../lib/checkLog');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const models = require('../models/models');

const usersPdf = async (req, res) => {}

const comics = async (req, res) => {}

const comments = async (req, res) => {}

router.get('/UsersReport.pdf',controller.UsersReport)
router.get('/ComicsReport.pdf',controller.ComicsReport)
router.get('/CommentsReport.pdf',controller.CommentsReport)

module.exports = router;
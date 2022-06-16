const express = require('express');
const controller = require('../controllers/userController');
const globalController = require('../controllers/globalController');
const  {isLoggedIn, isNotLoggedIn} = require('../lib/checkLog');
const router = express.Router();

//*Done
//router.get('/login',isNotLoggedIn, controller.login);
//*Done
router.get('/register', isNotLoggedIn, controller.register_get);
//*Done
router.post('/register', isNotLoggedIn, controller.register_post);
//*Done
router.get('/settings', isLoggedIn, controller.settings);
//*Done
router.get('/deleteUser/:id', controller.deleteUser);
//*Done
router.get('/editUser/:id', controller.editUser_get);
//*Done
router.post('/editUser/:id', controller.editUser_post);
//*Done
router.get('/logout', controller.logout);

const pool = require('../database.js')

module.exports = router;
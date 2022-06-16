const {Sequelize, DataTypes} = require('sequelize');

module.exports = new Sequelize('tesis2','root','',{
    host: 'localhost',
    dialect: 'mariadb',
    logging: false
})
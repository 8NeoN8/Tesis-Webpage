const {Sequelize} = require('sequelize');

const sequelize = new Sequelize('tesis2','root','',{
    host: 'localhost',
    dialect: 'mariadb',
    logging: false
})

module.exports = async function(){
    try {
        await sequelize.authenticate().then(console.log('Database2 Connected'));
    } catch (err) {
        console.log('Unable to connect to the Database');
    }
};
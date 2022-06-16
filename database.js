const mysql = require('mysql');
const {promisify} = require('util');


const db = {
    host: 'localhost',
    user: 'root',
    password: '',
    databse: 'tesis'
}


const pool = mysql.createPool(db);

pool.getConnection((err, connection)=>{
    if (err) console.log(err);
    if (connection) {
        connection.release();
        console.log('Database connected');
    };
    return;
})

pool.query = promisify(pool.query)



/* const {Sequelize} = require('sequelize');

const sequelize = new Sequelize('tesis','root','',{
    host: localhost,
    dialect: 'mariadb',
    logging: false
})

try {
    await sequelize.authenticate();
    console.log('Database Connected');
} catch (err) {
    console.log('Unable to connect to the Database');
} */

module.exports = pool;
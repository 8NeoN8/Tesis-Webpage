const bcrypt = require('bcrypt');
const helpers = {};
const {format} = require('timeago.js');

helpers.encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);
    return hashedPassword;
}

helpers.matchPassword = async (password, savedPassword) => {
    return await bcrypt.compare(password, savedPassword);
}

helpers.timeAgo = (timestamps) =>{
    return format(timestamps);
}

module.exports = helpers;
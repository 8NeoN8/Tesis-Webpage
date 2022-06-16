const login = (req, res) => {

    res.render('./user/login', {tittle: 'login', success: req.flash('success'), error: req.flash('error'), message: req.flash('message')})
    console.log(req.originalUrl);
}


const logout = (req, res) => {
    req.logOut();
    res.redirect('../')
}

module.exports = {
    login,
    logout,
}
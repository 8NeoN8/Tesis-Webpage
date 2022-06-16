module.exports = {
    isLoggedIn(req,res,next){
        if (req.isAuthenticated()) {
            console.log(req.originalUrl);
            return next();
        }
        req.session.returnTo = req.originalUrl;
        return res.redirect('/user/login')
    },
    isNotLoggedIn(req,res,next){
        if (req.isAuthenticated()) {
            return res.redirect('back')
        }
        return next();
    }
}
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const helpers = require('./helpers');

function initialize(passport, getUserByEmail, getUserById){
    const authenticateUser = async (email, password, done) => {
        let user;
        await getUserByEmail(email)
            .then(e=> user = e)
        if (user == null) return done(null, false, {message: 'No se encontro un usuario'})

        try {
            if(helpers.matchPassword(password, user[0].password))
                return done(null, user)

            return done(null, false, {message: 'Contraseña incorrecta'})

        } catch (err) {
            return done(err,false);
}
    }
    passport.use(new LocalStrategy({usernameField: 'email',passwordField: 'password'},
    authenticateUser))

    passport.serializeUser((user, done) => {
        done(null, user[0].id)
    })
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize;
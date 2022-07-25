const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const helpers = require('./helpers');
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById){
    const authenticateUser = async (email, password, done) => {
        let user;
        await getUserByEmail(email)
            .then(e=> user = e)
        if (user == null) return done(null, false)

        try {
            console.log('inputpasswprd :>> ', password);
            console.log('savedpass :>> ', user.password);

            console.log('innit? :>> ', await bcrypt.compare(password, user.password));

            if(await bcrypt.compare(password,user.password,)){
                return done(null, user)
            } else{
                throw Error("contraseña incorrecta")
            }

        } catch (err) {
            //console.log("error lmao ", err);
            done(null,false)
        }
    }
    passport.use(new LocalStrategy({usernameField: 'email',passwordField: 'password'},
    authenticateUser))

    passport.serializeUser((user, done) => {
        done(null, user.id)
    })
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize;
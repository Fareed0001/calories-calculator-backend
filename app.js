require("dotenv").config() //This is for the .env packsge from https://www.npmjs.com/package/dotenv
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy; //this uses google OAuth and we will use it as a passport strategy
const FacebookStrategy = require("passport-facebook"); //this uses facebook and we will use it as a passport strategy
const findOrCreate = require("mongoose-findorcreate"); //for mongoose find or create one

const app = express(); 

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

// SESSION AUTHENTICATION
//check https://www.npmjs.com/package/express-session to get better understanding on session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize()); //this method comes with passport and sets it up for use
app.use(passport.session()); //this tell the app to use passport to also set up session

//Connect to your mongodb database
mongoose.set('strictQuery', false);
mongoose.connect("mongodb://localhost:27017/caloriesCalculatorUserDB", {
  useNewUrlParser: true
});

//creating encryption schema for the database https://www.npmjs.com/package/mongoose-encryption
const userSchema = new mongoose.Schema({ //This is to change our schema into a mongoose object schema ie https://www.npmjs.com/package/mongoose-encryption or https://mongoosejs.com/docs/schematypes.html
  username: String,
  password: String
});

// TO CREATE A NEW SCHEMA TO HOUSE USER INFORMATION 
const userDetailSchema = new mongoose.Schema({ //This is to change our schema into a mongoose object schema ie https://www.npmjs.com/package/mongoose-encryption or https://mongoosejs.com/docs/schematypes.html
  newUser_id: String, 
  firstname: String,
  lastname: String,
  username: String,
  password: String,
  picture: String 
});



//passport-local-mongoose
userSchema.plugin(passportLocalMongoose); //this is what we will use to hash and salt our data and save it in our mongoose database
userSchema.plugin(findOrCreate); //for mongoose fidorcreate

//creating a model for the database
const User = new mongoose.model("User", userSchema); //this is to create the User model and telling it to use the userSchema
const userDetail = new mongoose.model("userDetail", userDetailSchema); //this is a model for the userdetail schema

//passport local mongoose configuration code
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

//this code is from the passport docs (https://www.passportjs.org/tutorials/google/session/)
passport.serializeUser(function(user, cb) { //this creates a cookie
  process.nextTick(function() {
    cb(null, {
      id: user.id,
      username: user.username,
      password: user.password
     });
  });
});

passport.deserializeUser(function(user, cb) { //this destroys the cookie
  process.nextTick(function() {
    return cb(null, user);
  });
});

//google strategy code from passport site "https://www.passportjs.org/packages/passport-google-oauth20/"
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID, //the client id stored in the .env file
  clientSecret: process.env.CLIENT_SECRET, //the client secret code stored in the .env file
  callbackURL: "http://localhost:3000/auth/google/caloriesCalculator", //the Authorised redirect URIs you set in the google developer console (inside credentions, OAuth 2.0 Client IDs click the project name and scroll down)
  // the path the callbackURL hits up in the server is http://localhost:3000/auth/google/caloriesCalculator
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //this makes retrieving user data instead of from the deprecated google plus, it should use the userinfo
  //be careful of typos
}, function(accessToken, refreshToken, profile, cb) { //here is where google sends back the access token that will allow us the user data
  // console.log(profile); //this is to log the user profile that we get back from the get request on /auth/google route
  User.findOrCreate({ //we use the data we got back from google ie user email to find a user if they exist, if they dont to create one
    username: profile.emails[0].value, //this adds it as a new mail so we can dodge an error
    googleId: profile.id //when a new user gets created, this finds if the user googleId record already exists in our database, in which case we save all the data associated with that id otherwise we create on our database and save that information for the future   
  }, function(err, user) {
    const newUser = new userDetail ({ //This would save the new user details into userDetail document
      newUser_id: user.id,  
      firstname: profile._json.given_name,
      lastname: profile._json.family_name,
      username:  profile._json.email,
      password: profile._json.sub,
      picture: profile._json.picture
    });
    newUser.save();
    
    return cb(err, user);
  });
}
));

//facebook strategy. code from https://www.passportjs.org/packages/passport-facebook/
passport.use(new FacebookStrategy({ //this will create a new facebook strategy
  clientID: process.env.FACEBOOK_APP_ID, //the clientID stored in the .env file
  clientSecret: process.env.FACEBOOK_APP_SECRET, //the clientSecret stored in the .env file
  callbackURL: "http://localhost:3000/auth/facebook/caloriesCalculator"
},
function(accessToken, refreshToken, profile, cb) { //here is where facebook sends back the access token that will allow us the user data
  console.log(profile); //this is to log the user profile that we get back from the get request on auth/facebook route
  User.findOrCreate({ //we use the data we got back from facebook ie username to find a user if they exist, if they dont to create one
    facebookId: profile.id //when a new user gets created, this finds if the user facebook record already exists in our database, in which case we save all the data associated with that user otherwise we create on our database and save that information for the future
  }, function(err, user) {
    const name = profile.displayName;

    const newUser = new userDetail ({ //This would save the new user details into userDetail document
      newUser_id: user.id,  
      firstname: name.split(" ")[0], //this slits the username into its first and last name components
      lastname: name.split(" ")[1],
      username:  profile.displayName,
      password: profile.id,
      picture: profile.profileUrl
    });
    newUser.save();

    return cb(err, user);
  });
}
));




// ROUTES
// AUTHENTICATION ROUTES 
//path for google button. this code was gotten from the passport-google-oauth20 docs (https://www.passportjs.org/packages/passport-google-oauth20/)
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"] //this increases the scope to accept email so that we can bypass an error
  }) //this will authenticate the user using google strategy. we are telling google that we need the users profile which includes their username and id
  //the code creates a pop-up that allows users sign in into their google accounts
  //it will initiate
);

//after user is authenticated using google, they are sent to this route
app.get("/auth/google/caloriesCalculator", //this is the route you provided in the google app console under credentials, OAuth 2.0 Client IDs, Authorised redirect URIs
  passport.authenticate("google", {
    failureRedirect: "/singin"
  }), //we authenticate the user locally and if there is any problem we send them back to the login page
  function(req, res) {
    res.redirect("/dashboard"); //successful authentication and we send them to the dashboard route (to app.get /dashboard)
  }
);

//authenticating requests using facebook. code from (https://www.passportjs.org/packages/passport-facebook/)
app.get("/auth/facebook",
  passport.authenticate('facebook') //this will authenticate the user using facebook strategy. we are telling facebook that we need the users profile which includes their username and id
  //the code creates a pop-up that allows users sign in into their facebook accounts
);

//after user is authenticated using facebook, they are sent to this route
app.get("/auth/facebook/caloriesCalculator", //this is the route you provided in the facebook app console under credentials
  passport.authenticate("facebook", {
    failureRedirect: "/signin"
  }), //we authenticate the user locally and if there is any problem we send them back to the login page
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard"); //successful authentication and we send them to the secret route (to app.get /secrets)
  }
);






// PAGES ROUTE
app.get("/", function(req, res) {
  res.render("index");
});


// ABOUT ROUTE
app.get("/about", function(req, res) {
  res.render("about");
});
 

//CONTACT ROUTE
app.get("/contact", function(req, res) {
  res.render("contact");
});


//SIGN-UP ROUTE
app.get("/signup", function(req, res) {
  res.render("signup");
});


//SIGN-IN ROUTE
app.get("/signin", function(req, res) {
  res.render("signin");
});

// DASHBOARD ROUTE 
app.get("/dashboard", function(req, res) {
  //here is where we check if the user is authenticated
  if (req.isAuthenticated()){ //if the user is logged in then render the dashboard page
    res.render("dashboard");
  } else { //else send them to the signup page so that they will signup
    res.render("signup");
  }
});

// LOGOUT
app.get("/logout", function(req, res) { //here we deauthenticate the user and end the user sesion
  req.logout(function(err) { //this is to logout using passport
    if (err) {
      console.log(err);
    } else {
      res.redirect("/"); //this should redirect them to the homepage
    }
  });
});



// POST ROUTES
//using passport to authenticate new users
app.post("/signup", function(req, res) { //This is to recieve the post request from the register form

  User.register({username: req.body.username}, req.body.password, function(err, user) { //using the User model, the argument thats a username value, password and a function       
    
    if (err) {
      console.log(err);
      res.redirect("/signup"); //this returns the user back to the signup page so that they can retry
    } else { //if there are no errors we authenticate the user
      passport.authenticate("local")(req, res, function() { //this function only works if the authentication was successful
        res.redirect("/dashboard"); //when the authentication works, the user gets sent to the dashboard
      });
    }

    const newUser = new userDetail ({ //This would save the new user details into another document
      newUser_id: user.id,  
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      username:  req.body.username,
      password: req.body.password
    });
    newUser.save();

  });
});

app.post("/signin", function(req, res) { //this route is to login after users have already signed up. it is below the signup route because you need to be inside the database before you can login
  const user = new User({ //we create a new user
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) { //this uses the new user to check if an existing user credentials is in our database
    if (err) {
      res.send("wrong username or password")
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, function() { //authenticates to see if username matches password in the database
        res.redirect("/dashboard"); //this would send the user to the dashboard route to check if they are authenticated or not
      });
    }
  });
});




app.listen(3000, function() {
  console.log("Server is hot and running on port 3000");
});
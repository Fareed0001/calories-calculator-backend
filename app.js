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
  password: String
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

// ROUTES
// HOME ROUTE
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

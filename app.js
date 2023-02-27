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


//SIGN-IN ROUTE
app.get("/signin", function(req, res) {
  res.render("signin");
});


//SIGN-UP ROUTE
app.get("/signup", function(req, res) {
  res.render("signup");
});

















app.listen(3000, function() {
  console.log("Server is hot and running on port 3000");
});

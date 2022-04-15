//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session= require("express-session");
const passport=require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");



const homeStartingContent = "Welcome to my tech portfolio. This is where I will be taking you with me on my journey of becoming a better web-developer everyday. stay tuned and take a look around my website!";
const aboutContent = "I am a highschool Math and Science teacher, currently teaching myself web-developement. Interested in learning more about both front and backend. I am dedicated, willing to learn new things always, and work well with feedback.";

const contactContent = "To contact me about any inquries or opportunities, see socials, and email below!"
const app = express();
console.log(process.env.API_KEY);

let posts= [];

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//to use mongoose. out DB will be called userDB
mongoose.connect("mongodb+srv://Admin-Esra:Yamen411628@cluster0.hmmtk.mongodb.net/userDB",{useNewUrlParser: true});
//set up new user dB. create schema
//pbject created from mongoose schema class.
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//use convenient method to define a secret
//add plugin onto Schema and pass in secret as js object
//add plugin to schema before adding new mongoose model
//this is because mongoose schema is one of the parameters to create new mongoose model (user)

//use user schema to set up new user model. our collection called "User"
const User = new mongoose.model("User", userSchema);
//we can now start creating users and adding it to userDB. we create users when client goes to register page and type in their email and password.
passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req,res){
res.render("home", {
  startingContent: homeStartingContent,
  posts:posts
});
});

app.get("/auth/google",
 passport.authenticate("google",{scope:["profile"]}
));

app.get("/auth/google/secrets",
passport.authenticate("google",{failureRedirect:"/login"}),
function(req,res){
  res.redirect("/secrets");
});

app.get("/posts", function(req,res){
res.render("posts", {
  startingContent: homeStartingContent,
  posts:posts
});
});

app.get("/about", function(req,res){
res.render("about", {theAboutt: aboutContent});
});

app.get("/contact", function(req,res){
res.render("contact", {theContact: contactContent});
});

app.get("/projects", function(req,res){
res.render("projects");
});

app.get("/compose", function(req,res){
res.render("compose");
});

//for the security project

app.get("/anonymous", function(req,res){
res.render("anonymous");
});

app.get("/login", function(req,res){
res.render("login");
});

app.get("/register", function(req,res){
res.render("register");
});

app.get("/secrets", function(req, res){
User.find({"secret": {$ne: null}}, function(err,foundUsers){
  if(err){
    console.log(err);
  }else{
    if(foundUsers){
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  }
});
});

app.get("/submit", function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res){
  const submittedSecret=req.body.secret;
  console.log(req.user.id);
    User.findById(req.user.id, function(err,foundUser){
            if(err){
              console.log(err);
            }else{
            if(foundUser) {
        foundUser.secret =submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/login");
});

//add md5 to turn into an irreversible hash
app.post("/register", function(req,res){
User.register({username:req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});

});

app.post("/login", passport.authenticate('local',{
  successRedirect:'/secrets',
  failureRedirect:'/login'
}));

//for the security project


app.post("/compose",function(req,res){
    const post ={
      title: req.body.postTitle,
      content:req.body.posTing
    };
 posts.push(post);
 console.log(posts);
 res.redirect("/posts");
});

app.get("/posts/:name", function(req,res){
const requestedTitle=_.lowerCase(req.params.name);
posts.forEach(function(post){
  const storedTitle = _.lowerCase(post.title);

  if(storedTitle===requestedTitle){
    console.log("yep");
    res.render("post",{title:post.title, content:post.content});
  };
});
});

let port = process.env.PORT;
if(port==null||port==""){
  port=3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});

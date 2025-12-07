// packages, imports
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require('dotenv').config({
    path: path.resolve(__dirname, '.env')
});

const routes = require("./routes");


const portNumber = 8444;

const uri = process.env.MONGO_CONNECTION_STRING;
mongoose.connect(uri);

/* start web server */
const app = express();
app.set("view engine", "ejs");
app.set("views", "./templates");
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes); // use the routes defined in ./routes.js

app.listen(portNumber);
console.log(`server up @ http://localhost:${portNumber}/`);

const express = require("express");
const path = require("path");
const router = express.Router();
const mongoose = require("mongoose");
require('dotenv').config({
    path: path.resolve(__dirname, '.env')
});

// define schema for saving user guesses
const guessSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    guessedProbability: { type: Number, required: true, min: 0, max: 100 },
    actualProbability: { type: Number, min: 0, max: 100 },
    timestamp: { type: Date, default: Date.now }
});
const Guess = mongoose.model('Guess', guessSchema);


// Home page
router.get("/", (req, res) => {
    res.render("index");
});

// Process guess
router.post("/", async (req, res) => {
    let {userId, name, guessedProbability} = req.body;

    try {
        // Call genderize.io API
        fetch(`https://api.genderize.io/?name=${name.toLowerCase()}&api_key=${process.env.GENDERIZE_API_KEY}`)
            .then(res => {
                console.log(res);
                return res.json()
            })
            .then(async (data) => {
                let probabilityMale = null;
                if (data.probability !== null) {
                    if (data.gender === 'male') {
                        probabilityMale = Math.round(data.probability * 100);
                    } else if (data.gender === 'female') {
                        probabilityMale = Math.round((1 - data.probability) * 100);
                    }
                }

                // Save to MongoDB using Mongoose
                const newGuess = new Guess({
                    userId: userId,
                    name: name,
                    guessedProbability: parseInt(guessedProbability),
                    actualProbability: probabilityMale
                });

                await newGuess.save();

                const variables = {
                    userId: userId,
                    name: name,
                    guessedProbability: guessedProbability,
                    actualProbability: probabilityMale ?? "null",
                    gender: data.gender ?? "null"
                };

                res.render("processGuess", variables);
            })
            .catch(e => {
                console.error(e);
                res.status(500).send("Error fetching from API");
            });
    } catch (e) {
        console.error(e);
        res.status(500).send("Error processing guess");
    }
});

// Lookup page
router.get("/lookup", (req, res) => {
    res.render("lookup");
});

// Process lookup
router.post("/lookup", async (req, res) => {
    let {userId} = req.body;

    try {
        // Find all guesses for this user using Mongoose
        const guesses = await Guess.find({userId: userId}).sort({timestamp: -1});

        let tableHTML = "";
        if (guesses.length > 0) {
            tableHTML = `<table border="1"><tr><th>Name</th><th>Guessed MP</th><th>Actual MP</th><th>Timestamp</th></tr>`;

            guesses.forEach(guess => {
                const timestamp = new Date(guess.timestamp).toLocaleString();
                tableHTML += `
                    <tr>
                    <td>${guess.name}</td>
                    <td>${guess.guessedProbability}</td>
                    <td>${guess.actualProbability}</td>
                    <td>${timestamp}</td>
                    </tr>`;
            });

            tableHTML += '</table>';
        } else {
            tableHTML = '<p>No guesses found for this user.</p>';
        }
        const guesscount = guesses.length;
        const variables = {
            userId: userId,
            tableHTML: tableHTML,
            count: guesscount,
        };

        res.render("processLookup", variables);
    } catch (e) {
        console.error(e);
        res.status(500).send("Error looking up guesses");
    }
});

router.post("/deleteGuesses", async (req, res) => {
    let {userId} = req.body;

    try {
        const result = await Guess.deleteMany({userId: userId});

        const variables = {
            userId: userId,
            deletedCount: result.deletedCount
        };

        res.render("processDelete", variables);
    } catch (e) {
        console.error(e);
        res.status(500).send("Error deleting guesses");
    }
});

module.exports = router;
/* jshint node:true */

/**
 * Module dependencies.
 */
var express = require('express'),
    routes = require('./routes'),
    session = require("express-session"),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    bodyParser = require('body-parser');


var app = express();
var conversationMode = false;
if (process.env.CONVERSATION_MODE === "true") {
    conversationMode = true;
}

// if deploying to a different route, update this variable:
var baseURL = process.env.BASE_URL;
if (process.env.DEVMODE === "true") {
    baseURL = process.env.DEV_URL;
}

if (process.env.DEPLOY === "swarm") {
    // credentials are stored in secrets files instead of
    // environment variables; read each one and load them
    // into our application environment
    console.log("Swarm deploy mode is detected; collecting credentials from secrets");
    var basePath = "/run/secrets/";
    var list = ["flightstats_app_key", "weather_url", "tripit_api_secret", "tripit_api_key",
        "flightstats_app_id", "cloudant_url"
    ];
    for (var i = 0; i < list.length; i++) {
        var contents = fs.readFileSync(basePath + list[i], "utf8");
        contents = contents.replace(/[\n\r]/g, ''); //remove trailing newline
        global[list[i]] = contents;
    }
} else if (process.env.DEPLOY === "kubernetes") {
    console.log("Kubernetes deploy mode is detected; collecting credentials from secrets");
    var basePath = "/run/secrets/";
    var list = ["flightstats-app-id", "flightstats-app-key",
        "tripit-api-key", "tripit-api-secret"
    ];
    for (var i = 0; i < list.length; i++) {
        var contents = fs.readFileSync(basePath + list[i], "base64");
        contents = contents.replace(/[\n\r]/g, ''); //remove trailing newline
        var key = list[i].replace(/[-]/g, '_'); // replace - with _ as - is not allowed in var name
        global[key] = contents;
    }
    baseURL = process.env.BASE_URL;
}
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'wilson dog ball', proxy: true, resave: true, saveUninitialized: true }));
app.use(bodyParser.json()); // support json encoded bodies

app.get('/', routes.index);

app.get("/authorize", function(req, res) {
    tripit.authorize(baseURL + "flights", req.query.mobile, res);
});

var tripdata = require('./routes/tripdata.js'),
    tripit = require('./tripit.js'),
    flightstats = require('./flightstats.js'),
    weather = require('./weather.js'),
    conversation = require('./conversation.js');

app.get("/flights", function(req, res) {
    var respData = {};
    // will store the access tokens in the session
    tripit.getAccessTokens(req).then(function(results) {
        req.session.oauth_access_token = results[0];
        req.session.oauth_access_token_secret = results[1];
        var accessToken = results[0];
        var accessTokenSecret = results[1];
        console.log("acquired OATH access tokens");

        // access TripIt trip data using our authenticated access information
        console.log("Request profile data for the authenticated TripIt user..");
        tripit.getProfileData(accessToken, accessTokenSecret).then(function(results) {
            var profile = JSON.parse(results[0]);
            respData.name = profile.Profile.screen_name;
            respData.company = profile.Profile.company;
            respData.photo = profile.Profile.photo_url;
            respData.home = profile.Profile.home_city;
            console.log("Received profile info for " + respData.name + ". Rendering response..");
            req.session.user = respData.name;
            // we have our static (older) view of travel details, or the
            // Watson powered "conversation" mode
            if (conversationMode === true) {
                res.render("conversation", respData);
            } else {
                res.render("trips", respData);
            }
        }, function(error) {
            console.log(error);
            respData.message = "Could not retrieve TripIt profile, error: " + error.data;
            respData.no_data = "error";
            res.render("trips", respData);
        });
    }, function(error) {
        console.log("Error getting authorization tokens: " + error.data);
        respData.message = "OAUTH login to TripIt failed with: " + error.data;
        respData.no_data = "error";
        res.render("trips", respData);
        return;
    });
});

// wrap all AJAX-used methods to do an XHR check to limit use from outside of
// our application:
app.use("/i/\*", function(req, res, next) {
    if (req.xhr === true) {
        next();
    } else {
        // reject API calls not from our application
        console.log("Non-Xhr request to API from: " + req.hostname + " (IP: " + req.ip + ")\nHeaders: " +
            "%j\nQuery: %j", req.headers, req.query);
        res.status(403).send("API access forbidden.");
    }
});

// called via AJAX method to query user's trip data; return current flights
app.get("/i/tripdata", tripdata.getFlights);

// endpoints for flightstats API lookups:
app.get("/i/flightinfo", flightstats.getFlightInfo);
app.get("/i/conninfo", flightstats.getConnections);

// weather endpoint
app.get("/i/weather", weather.getThreeDayForecast);

// Watson conversation service endpoint
app.post("/conversation", conversation.Message);

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log('FlightAssist server listening on port ' + app.get('port'));
});

// handle signals properly for when running without init/shell in container:

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint() {
    console.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
    shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm() {
    console.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
    shutdown();
});

// shut down server
function shutdown() {
    process.exit();
}
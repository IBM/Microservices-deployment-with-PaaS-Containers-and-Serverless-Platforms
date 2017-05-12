// retrieve and cache weather data

var Cloudant = require('cloudant'),
    fs = require('fs');

var restcall = require('./restcall.js');
var url = require('url');

// cloudant & weather co. credentials URL
var cURL = "";
var weatherURL = "";
if (process.env.DEVMODE === "true") {
    if (process.env.DEPLOY === "swarm") {
        cURL = global.cloudant_url;
        weatherURL = global.weather_url;
    } else {
        cURL = process.env.CLOUDANT_URL;
        weatherURL = process.env.WEATHER_URL;
    }
} else if (process.env.DEPLOY === "kubernetes") {
    console.log("kubernetes deploy mode is detected")
    var binding = JSON.parse(fs.readFileSync('/opt/service-bind/binding', 'utf8'));
    cURL = binding.url
} else {
    var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
    cURL = vcap_services.cloudantNoSQLDB[0].credentials.url;
    weatherURL = vcap_services.weatherinsights[0].credentials.url;
}

var cloudant = Cloudant({ url: cURL, plugin: 'promises' });

module.exports = {
    // requires input in the query string:
    // - lat = location latitude
    // - lon = location longitude
    // - locID = airport code representing this location (for cache key)
    getThreeDayForecast: function(req, resp) {
        // retrieve forecast from either cache; or
        // if cache is "expired", re-query from weather co. API

        // Look up cache..
        getCachedData(req.query.locID).then(function(data) {
            var now = Date.now();
            if ((now - data.cachetime) > 10 * 60 * 1000) {
                // data older than 10 minutes; don't use cache
                console.log("Expiring cached weather data for " + req.query.locID);
                data.expired = true;
            }
            return data;
        }).catch(function(err) {
            console.log("[getCachedWeatherData] Cloudant lookup error/empty: " + err);
        }).then(function(data) {
            if (!isEmpty(data) && !data.expired) {
                // use cached weather data
                console.log("using cached weather data for " + req.query.locID);
                resp.send(data);
                return;
            }
            if (process.env.USE_WEATHER_SERVICE !== "true") {
                if (process.env.USE_WEATHER_SERVERLESS !== "true") {
                    // our default mode: as a "monolith" deployment; simply use our external
                    // API query to retrieve weather company data
                    return handleViaWeatherAPI(req, resp, data);
                } else {
                    // use an OpenWhisk action to retrieve the weather forecast details
                    return handleViaWeatherWhiskAction(req, resp, data);
                }
            } else {
                // external weather microservice deployment mode; call
                // our microservice using service name ("weather-service")
                // or if dev mode, simply look on localhost at the expected port
                return handleViaWeatherMicroservice(req, resp, data);
            }
        });
    }
};

// handle a request for weather data via direct call to Weather Co. data API
function handleViaWeatherAPI(req, resp, data) {
    var host = "";
    var endpoint = "/api/weather/v1/geocode/" + req.query.lat + "/" + req.query.lon + "/forecast/daily/3day.json";
    var wURLObj = url.parse(weatherURL);
    host = wURLObj.host;
    var authStr = wURLObj.auth;

    var options = {
        host: host,
        path: endpoint,
        method: "GET",
        auth: authStr,
        rejectUnauthorized: false
    };

    //send the request to the Weather API
    restcall.get(options, true, function(newData) {
        // cache this data in cloudant with the current epoch ms
        var currentEpochms = Date.now();
        newData.cachetime = currentEpochms;
        if (!isEmpty(data)) {
            //set the rev ID so cache update works
            newData._rev = data._rev;
        }
        newData._id = req.query.locID;
        cacheWeatherData(newData);
        // send data as response:
        console.log("sending JSON weather response for " + req.query.locID);
        resp.send(newData);
    });
}

function handleViaWeatherMicroservice(req, resp, data) {
    console.log("using external weather microservice: " + process.env.USE_WEATHER_SERVICE);
    // overwrite host, endpoint to point to our weather microservice
    if (process.env.DEVMODE === "true" && process.env.DEPLOY !== "swarm") {
        host = "localhost";
    } else {
        host = "weather-service";
    }
    var endpoint = "/weather/" + req.query.lat + "/" + req.query.lon;

    var options = {
        host: host,
        port: 5000,
        path: endpoint,
        method: "GET",
        rejectUnauthorized: false
    };

    //send the request to the Weather API
    restcall.get(options, false, function(newData) {
        // cache this data in cloudant with the current epoch ms
        var currentEpochms = Date.now();
        newData.cachetime = currentEpochms;
        if (!isEmpty(data)) {
            //set the rev ID so cache update works
            newData._rev = data._rev;
        }
        newData._id = req.query.locID;
        cacheWeatherData(newData);
        // send data as response:
        console.log("sending JSON weather response for " + req.query.locID);
        resp.send(newData);
    });
}

// handle a request for weather data via calling an OpenWhisk action
function handleViaWeatherWhiskAction(req, resp, data) {
    console.log("use OpenWhisk action for weather service: " + process.env.USE_WEATHER_SERVERLESS);

    var host = "openwhisk.ng.bluemix.net";
    var endpoint = "/api/v1/namespaces/whisk.system/actions/weather/forecast?blocking=true";
    var options = {
        host: host,
        path: endpoint,
        method: "POST",
        auth: process.env.OPENWHISK_AUTH,
        rejectUnauthorized: false
    };

    // we need our weather API credentials from the weather URL
    var wURLObj = url.parse(weatherURL);
    var weatherAuth = wURLObj.auth.split(":");
    var postdata = {
        "username": weatherAuth[0],
        "password": weatherAuth[1],
        "latitude": req.query.lat,
        "longitude": req.query.lon,
    };

    //direct call the OpenWhisk action via HTTP
    restcall.post(options, true, postdata, function(newData) {
        // OpenWhisk HTTP response has the JSON data in "{ response: { result: { ..."
        console.log(JSON.stringify(newData));
        var forecastData = newData.response.result;
        // cache this data in cloudant with the current epoch ms
        var currentEpochms = Date.now();
        forecastData.cachetime = currentEpochms;
        if (!isEmpty(data)) {
            //set the rev ID so cache update works
            forecastData._rev = data._rev;
        }
        forecastData._id = req.query.locID;
        cacheWeatherData(forecastData);
        // send data as response:
        console.log("sending JSON weather response for " + req.query.locID);
        resp.send(forecastData);
    });
}

function getCachedData(location) {
    // query cloudant to see if we have cached any weather for this location
    var weatherDB = cloudant.db.use("weather");
    return weatherDB.get(location);
}

function cacheWeatherData(weatherData) {
    var weatherDB = cloudant.db.use("weather");
    weatherDB.insert(weatherData, function(err, data) {
        if (err) {
            console.log("Error on weather DB insert: " + err);
        }
    });
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}
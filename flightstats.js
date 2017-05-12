/* Retrieve data from FlightStats API */
var FlightStatsAPI = require("flightstats"),
    Cloudant = require('cloudant'),
    fs = require('fs');

var flightStatsAppId = "";
var flightStatsAppKey = "";
if (process.env.DEPLOY === "swarm" || process.env.DEPLOY === "kubernetes") {
    flightStatsAppId = global.flightstats_app_id;
    flightStatsAppKey = global.flightstats_app_key;
} else {
    flightStatsAppId = process.env.FLIGHTSTATS_APP_ID;
    flightStatsAppKey = process.env.FLIGHTSTATS_APP_KEY;
}

// cloudant credentials URL
var cURL = "";
if (process.env.DEVMODE === "true") {
    if (process.env.DEPLOY === "swarm") {
        cURL = global.cloudant_url;
    } else {
        cURL = process.env.CLOUDANT_URL;
    }
} else if (process.env.DEPLOY === "kubernetes") {
    console.log("kubernetes deploy mode is detected")
    var binding = JSON.parse(fs.readFileSync('/opt/service-bind/binding', 'utf8'));
    cURL = binding.url
} else {
    var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
    cURL = vcap_services.cloudantNoSQLDB[0].credentials.url;
}

var cloudant = Cloudant({ url: cURL, plugin: 'promises' });
var flightstats = new FlightStatsAPI({
    appId: flightStatsAppId,
    apiKey: flightStatsAppKey
});

module.exports = {
    // requires input in the query string:
    // - date = YYYY-MM-DD (departure date)
    // - airline = fs code (e.g. AA = American Airlines)
    // - flightnum = flight number
    // - airport = arrival airport code (e.g. SFO)
    getFlightInfo: function(req, resp) {
        // retrieve flight
        var opts = {
            date: new Date(Date.parse(req.query.date)),
            airlineCode: req.query.airline,
            flightNumber: req.query.flightnum,
            airport: req.query.airport,
        };
        flightstats.lookup(opts, function(err, data) {
            if (err) {
                console.log("error looking up flight status: " + err);
                resp.send(err);
                return;
            }
            console.log("sending flight lookup response for %j%j", req.query.airline, req.query.flightnum);
            resp.send(data);
        });
    },
    getConnections: function(req, resp) {
        // get connecting flights options
        // requires the following in the query string:
        // - date = YYYY-MM-DD HH:MM:SS (time to start search)
        // - depairport = departing airport code (e.g. CHO)
        // - arrairport = arrival airport code (e.g. SFO)
        // - numhours = number of hours to search from start
        // - results = number of results to return

        // Look up cache first for connections data..
        var fingerprint = req.query.date + "_" + req.query.depairport + "_" + req.query.arrairport +
            "_" + req.query.numhours + "_" + req.query.results;
        getCachedData(fingerprint).then(function(data) {
            var now = Date.now();
            if ((now - data.cachetime) > 120 * 60 * 1000) {
                // data older than 2 hours; don't use cache
                console.log("Expiring cached connections data for " + fingerprint);
                data.expired = true;
            }
            return data;
        }).catch(function(err) {
            console.log("[getCachedFlightConnectionsData] Cloudant lookup error/empty: " + err);
        }).then(function(data) {
            if (!isEmpty(data) && !data.expired) {
                // use cached connections data
                console.log("using cached connecting flight data for " + fingerprint);
                resp.send(data);
                return;
            }
            // no cache or cache expired; query connection data
            var opts = {
                date: new Date(Date.parse(req.query.date)),
                departureAirport: req.query.depairport,
                arrivalAirport: req.query.arrairport,
                numHours: req.query.numhours,
                maxResults: req.query.results,
            };
            flightstats.firstFlightOut(opts, function(err, newData) {
                if (err) {
                    console.log("error looking up flight connections: " + err);
                    resp.send(err);
                    return;
                }
                if (!isEmpty(data)) {
                    //set the rev ID so cache update works
                    newData._rev = data._rev;
                }
                // cache this data in cloudant with the current epoch ms
                var currentEpochms = Date.now();
                newData.cachetime = currentEpochms;
                newData._id = fingerprint;
                cacheConnectionsData(newData);
                console.log("sending flight connections JSON response for %j - %j on %j", req.query.depairport, req.query.arrairport, req.query.date);
                resp.send(newData);
            });
        });
    }
};

function getCachedData(fingerprint) {
    // query cloudant to see if we have cached any connections data for this query combination
    var connDB = cloudant.db.use("connections");
    return connDB.get(fingerprint);
}

function cacheConnectionsData(connData) {
    var connDB = cloudant.db.use("connections");
    connDB.insert(connData, function(err, data) {
        if (err) {
            console.log("Error on connections DB insert: " + err);
        }
    });
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}

/* Retrieve trip information */

var TripItApiClient = require("tripit-node"),
    Cloudant = require('cloudant'),
    fs = require('fs');

var tripItKey = "";
var tripItSecret = "";

if (process.env.DEPLOY === "swarm" || process.env.DEPLOY === "kubernetes") {
    tripItKey = global.tripit_api_key;
    tripItSecret = global.tripit_api_secret;
} else {
    tripItKey = process.env.TRIPIT_API_KEY;
    tripItSecret = process.env.TRIPIT_API_SECRET;
}
var client = new TripItApiClient(tripItKey, tripItSecret);

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

var requestTokenSecrets = {};

module.exports = {
    authorize: function(callBackURL, isMobile, res) {
        var baseURL = "https://www.tripit.com";
        if (isMobile === "true") {
            baseURL = "https://m.tripit.com";
        }
        client.getRequestToken().then(function(results) {
            var token = results[0],
                secret = results[1];
            requestTokenSecrets[token] = secret;
            res.redirect(baseURL + "/oauth/authorize?oauth_token=" + token + "&oauth_callback=" + callBackURL);
        }, function(error) {
            res.send(error);
        });
    },
    getAccessTokens: function(req) {
        var token = req.query.oauth_token,
            secret = requestTokenSecrets[token],
            verifier = req.query.oauth_verifier;
        return client.getAccessToken(token, secret, verifier);
    },
    getProfileData: function(accessToken, accessTokenSecret) {
        return client.requestResource("/get/profile", "GET", accessToken, accessTokenSecret);
    },
    getTrips: function(user, accessToken, accessTokenSecret) {
        var tripList = {};
        return getUserTrips(user).then(function(data) {
            tripList = data;
        }).catch(function(err) {
            console.log("[getUserTrips] Cloudant lookup error/empty: " + err);
        }).then(function() {
            if (isEmpty(tripList)) {
                return client.requestResource("/list/trip/traveler/true/exclude_types/weather/include_objects/true", "GET", accessToken, accessTokenSecret);
            } else {
                // only request and update since the last query of TripIt and then merge
                // updates into our cache
                var modifiedParam = "modified_since/" + tripList.timestamp;
                return client.requestResource("/list/trip/traveler/true/exclude_types/weather/" + modifiedParam + "/include_objects/true", "GET", accessToken, accessTokenSecret);
            }
        }).then(function(data) {
            // process the trip API result data
            console.log("Acquired trip data from TripIt for " + user);
            return processTripData(user, tripList, JSON.parse(data[0]));
        }).catch(function(err) {
            console.log("Error retrieving trip data from TripIt: " + err);
        });
    }
};

function getUserTrips(user) {
    // query cloudant to see if we have cached any trips for this username
    var tripDB = cloudant.db.use("trips");
    return tripDB.get(user);
}

function putUserTrips(tripData) {
    var tripDB = cloudant.db.use("trips");
    tripDB.insert(tripData, function(err, data) {
        if (err) {
            console.log("Error on trip DB insert: " + err);
        }
    });
}

// This function is rather ugly. First, one of its jobs is to reduce
// the amount of trip information to just the outer "trip" object metadata
// and flight segments associated with that. Because the TripIt API does
// not join these two objects (Trips and AirObjects), we are doing that
// association/join in our "filtered" JSON representation.  Secondly, this function
// handles partial information updates ("modified_since/<timestamp>/" in TripIt
// API terms), and then has to re-assemble the filtered/combined JSON representation,
// while ignoring updates if there are no AirObject updates in the partial update.
function processTripData(user, tripJSON, newData) {
    if (isEmpty(tripJSON)) {
        tripJSON.timestamp = newData.timestamp;
        // this is all new data; nothing in the cache, so filter our required information
        // and cache it
        var trips = [];
        var airobjs = [];
        // walk the JSON looking for "Trip" and "AirObject" types
        for (var key in newData) {
            if (key === "Trip") {
                var trip = newData.Trip;
                if (trip instanceof Array) {
                    trips = trip;
                } else {
                    trips.push(newData.Trip);
                }
            } else if (key === "AirObject") {
                var airobj = newData.AirObject;
                if (airobj instanceof Array) {
                    airobjs = airobj;
                } else {
                    airobjs.push(newData.AirObject);
                }
            }
        }
        // assemble our variant of the JSON for cacheing/use

        var tripMap = new Map();
        for (var i = 0; i < trips.length; i++) {
            tripMap.set(trips[i].id, trips[i]);
        }
        for (var j = 0; j < airobjs.length; j++) {
            //find trip ID for this air object/segments and
            //add to trip information
            var relatedTrip = tripMap.get(airobjs[j].trip_id);
            if (relatedTrip === undefined) {
                console.log("Can't find trip for air segment!");
            } else {
                airArray = relatedTrip.air_segments;
                if (airArray === undefined) {
                    //haven't added any airsegments yet
                    airArray = [airobjs[j]];
                    relatedTrip.air_segments = airArray;
                } else {
                    relatedTrip.air_segments.push(airobjs[j]);
                }
            }
        }
        tripJSON.Trips = trips;
        tripJSON._id = user;
        putUserTrips(tripJSON);
        return tripJSON;
    }
    // first, clear any old trips from the cache (e.g. trips now in the past)
    tripJSON = removePastTrips(Date.now(), tripJSON);
    // set a new cache timestamp
    tripJSON.timestamp = newData.timestamp;
    // we have cached data; see if any trips are updated in the newData object from
    // the API call and update the cache
    var airUpdate = false;
    var changedTrips = [];
    var changedAirobjs = [];
    // walk the JSON looking for "Trip" and "AirObject" types
    for (var nkey in newData) {
        if (nkey === "Trip") {
            var dtrip = newData.Trip;
            if (dtrip instanceof Array) {
                changedTrips = dtrip;
            } else {
                changedTrips.push(dtrip);
            }
        } else if (nkey === "AirObject") {
            airUpdate = true;
            var dairobj = newData.AirObject;
            if (dairobj instanceof Array) {
                changedAirobjs = dairobj;
            } else {
                changedAirobjs.push(dairobj);
            }
        }
    }
    if (!airUpdate) {
        // no update necessary as no air segment changes happened
        // still write the cache as we have an updated "since"
        // timestamp that will limit getting back any "ignored"
        // updates next time we call the TripIt API.
        putUserTrips(tripJSON);
        return tripJSON;
    }
    // only if there are flight changes will we process
    // this update as our app only deals with flights
    var updateTripMap = new Map();
    for (var i = 0; i < changedTrips.length; i++) {
        updateTripMap.set(changedTrips[i].id, changedTrips[i]);
    }
    var cachedTrips = tripJSON.Trips;
    for (var k = 0; k < cachedTrips.length; k++) {
        if (updateTripMap.has(cachedTrips[k].id)) {
            // if we got an update on this trip, update it
            cachedTrips[k] = updateTripMap.get(cachedTrips[k].id);
            updateTripMap.delete(cachedTrips[k].id);
        }
    }
    // any elements left in the updated trip map are new
    // trips we have never cached:
    for (var newTrip of updateTripMap.values()) {
        cachedTrips.push(newTrip);
    }
    // now handle air segment adds/updates
    var newTripMap = new Map();
    for (var m = 0; m < cachedTrips.length; m++) {
        newTripMap.set(cachedTrips[m].id, cachedTrips[m]);
    }
    for (var n = 0; n < changedAirobjs.length; n++) {
        //find trip ID for this air object/segments and
        //add/update trip information
        var rTrip = newTripMap.get(changedAirobjs[n].trip_id);
        if (rTrip === undefined) {
            console.log("Can't find trip for air segment!");
        } else {
            airArray = rTrip.air_segments;
            if (airArray === undefined) {
                //haven't added any airsegments yet
                airArray = [changedAirobjs[n]];
                rTrip.air_segments = airArray;
            } else {
                var found = false;
                for (var p = 0; p < rTrip.air_segments.length; p++) {
                    if (rTrip.air_segments[p].id == changedAirobjs[n].id) {
                        found = true;
                        rTrip.air_segments[p] = changedAirobjs[n];
                    }
                }
                if (!found) {
                    // new segment to add to the trip
                    rTrip.air_segments.push(changedAirobjs[n]);
                }
            }
        }
    }
    tripJSON.Trips = cachedTrips;
    putUserTrips(tripJSON);
    return tripJSON;
}

function removePastTrips(epochMS, tripJSON) {
    var updatedTrips = [];
    var cachedTrips = tripJSON.Trips;
    for (var k = 0; k < cachedTrips.length; k++) {
        var endTrip = Date.parse(cachedTrips[k].end_date);
        if (endTrip > epochMS) {
            updatedTrips.push(cachedTrips[k]);
        }
    }
    tripJSON.Trips = updatedTrips;
    return tripJSON;
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}

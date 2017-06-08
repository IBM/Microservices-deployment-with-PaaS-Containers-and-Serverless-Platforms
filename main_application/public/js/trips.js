// javascript to handle getting trip data and showing possible flights
// and alternatives

function parseTripsForFlights(showAlternates, retrieveWithoutDisplay) {
    // notify searching
    $('#throbber-div-1').css("display", "block");
    $('#flight-results').css("display", "none");
    $('#flight-alternates').css("display", "none");
    // first we need trip data..
    ajaxCall("/i/tripdata", "GET", function(respData) {
        $('#throbber-div-1').css("display", "none");
        if (!retrieveWithoutDisplay) {
            $('#flight-results').css("display", "block");
        }
        var epochms = Date.now();
        var date = new Date(epochms);
        var today = date.getFullYear() + "-" + twoDigitString(date.getMonth() + 1) + "-" + twoDigitString(date.getDate() + 1);

        var tripList = respData.Trips;
        if (tripList === undefined || tripList.length === 0) {
            // report to the user they have no future trips at all in TripIt
            $("#flight-results").html("You have no upcoming trips in your TripIt profile!");
            return;
        }
        tripList.sort(sortTrips);
        var forceFlightView = (respData.forceFlights === 1);
        var currentTrip = findCurrentTrip(epochms, tripList);
        if (isEmpty(currentTrip) && !forceFlightView) {
            // notify the user that there are no trips at the current time
            var html = "Your next trip (" + tripList[0].display_name + " to " + tripList[0].primary_location + ") ";
            html += "starts on " + tripList[0].start_date + " and is more than 24 hours in the future. ";
            html += "Please check back within 24 hours of your first flight for further details.";
            $("#flight-results").html(html);
            return;
        }
        // developer mode way to test viewing flights even if the next trip
        // is further than 24 hours in the future
        if (forceFlightView) {
            // we've sorted the trips and we know the list isn't empty, so
            // just point to the first trip in the list
            currentTrip = tripList[0];
        }
        upcomingFlights = findFlights(epochms, currentTrip, forceFlightView);
        if (upcomingFlights.length === 0) {
            // no flights to show; give the user a few trip details and how
            // long until the first flight?
            var htmlResp = "Your trip (" + tripList[0].display_name + ") to " + tripList[0].primary_location + " is coming soon, but either you ";
            htmlResp += "have no flights associated with this trip or they are more than 24 hours ";
            htmlResp += " in the future. If you have flights, check back when your first segment ";
            htmlResp += " is 24 hours or less away.";
            $("#flight-results").html(htmlResp);
            return;
        } else {
            // display flight information
            // - data set includes
            //   .start_city_name
            //   .start_country_code
            //   .start_airport_code
            //   .end_city_name
            //   .end_country_code
            //   .end_airport_code
            //   .marketing_airline_code .marketing_flight_number (e.g. AA 5344 together)
            //   .aircraft_display_name ("Canadair RJ 900")
            //   .duration
            //   .seats (may not exist)
            //   .start_gate (may not exist)
            //   .end_gate (may not exist)
            //   .StartDateTime.{date, time, timezone, utc_offset}
            //   .EndDateTime.{date, time, timezone, utc_offset}
            var flightResults = { searchResults: upcomingFlights };
            var resultsStart = "<div class='resultsHeader'>Upcoming flights for your trip <span class='tripName'>" + tripList[0].display_name + "</span> to <span class='tripDestination'>" + tripList[0].primary_location + "</span> are listed below:</div>" +
                "<div class='resultsContainer'>";

            var resultsTmpl = "{{#searchResults}}\n" +
                "<div class='flightid'>{{marketing_airline_code}} {{marketing_flight_number}} <span class='flighttime'>{{duration}}</span></div>" +
                "<div class='flightresults'><table id='{{marketing_airline_code}}{{marketing_flight_number}}'>" +
                "<tr class='airport'><td class='airportDetails'><div class='airportCode'>{{start_airport_code}}</div><br/><span class='airportLoc'>{{start_city_name}}, {{start_country_code}}</span></td>" +
                "<td class='flightInfo'>" +
                "<div class='flightTime'><span class='fieldTitle'>Departs:</span> {{StartDateTime.date}} {{StartDateTime.time}}</div><br/>" +
                "<div class='gateInfo'><span class='fieldTitle'>Gate:</span> {{start_gate}}</div></td></tr>" +
                "<tr class='airport'><td class='airportDetails'><div class='airportCode'>{{end_airport_code}}</div><br/><span class='airportLoc'>{{end_city_name}}, {{end_country_code}}</span></td>" +
                "<td class='flightInfo'>" +
                "<div class='flightTime'><span class='fieldTitle'>Arrives:</span> {{EndDateTime.date}} {{EndDateTime.time}}</div><br/>" +
                "<div class='gateInfo'><span class='fieldTitle'>Gate:</span> {{end_gate}}</div></td></tr></table>" +
                "<div class='flightstatInfo' id='flightstats:{{marketing_airline_code}}:{{marketing_flight_number}}:{{StartDateTime.date}}:{{start_airport_code}}:{{end_airport_code}}'></div>" +
                "<div class='weatherInfo' id='weather:{{marketing_airline_code}}:{{marketing_flight_number}}:{{start_airport_code}}:{{start_airport_latitude}}:{{start_airport_longitude}}:{{end_airport_code}}:{{end_airport_latitude}}:{{end_airport_longitude}}'></div>" +
                "</div>\n" +
                "{{/searchResults}}";

            var htmlOut = Mustache.render(resultsTmpl, flightResults);
            $("#flight-results").html(resultsStart + htmlOut + "</div>");
            // trigger a custom event to fill in weather and flight status info
            $('div.flightstatInfo').trigger('instantiate');
            $('div.weatherInfo').trigger('instantiate');
            // add a div with the info necessary to search for alternative connections
            // collect: origin airport of first flight, destination airport of last flight
            //          and start datetime of first flight
            var startAirport = upcomingFlights[0].start_airport_code;
            var endAirport = upcomingFlights[upcomingFlights.length - 1].end_airport_code;
            var startTime = makeDateTimeString(upcomingFlights[0].StartDateTime);
            var idAlternates = startAirport + "_" + endAirport + "_" + startTime;
            $('#flight-alternates').append("<div id='" + idAlternates + "' class='alternateConnections'></div>");
            if (showAlternates) {
                $('#flight-alternates').trigger('instantiate');
            }
        }
    });
}

function findCurrentTrip(today, tripList) {
    for (var i = 0; i < tripList.length; i++) {
        var tripStart = Date.parse(tripList[i].start_date);
        var tripEnd = Date.parse(tripList[i].end_date);
        if (isSoonOrWithin(today, tripStart, tripEnd)) {
            return tripList[i];
        }
    }
    return {};
}

function findFlights(today, jsonTrip, forceFlightView) {
    // we have a trip object; look through the air segments for flights today (or next 24 hrs)
    var flightSegments = [];
    for (var n = 0; n < jsonTrip.air_segments.length; n++) {
        flightSegments = flightSegments.concat(jsonTrip.air_segments[n].Segment);
    }
    // we need the air segments to be in sorted by flight start time order
    flightSegments.sort(sortFlightSegments);

    // force current time offset to be at the next upcoming flight segment
    // so in development mode we can test the flight view
    if (forceFlightView) {
        var now = Date.now();
        // find next segment that is not in the past
        for (var k = 0; k < flightSegments.length; k++) {
            start = Date.parse(makeDateTimeString(flightSegments[k].StartDateTime));
            if (start >= now) {
                today = start;
                break;
            }
        }
    }
    var upcomingFlights = [];
    var lastFlightEnd = 0;
    var originAirport = "";
    var currentTerminus = "";
    for (var i = 0; i < flightSegments.length; i++) {
        var flightStartDate = Date.parse(makeDateTimeString(flightSegments[i].StartDateTime));
        if (inNextDay(today, flightStartDate) && (originAirport === "")) {
            // flight is coming up in next 24 hours; this is the first segment found
            upcomingFlights = [flightSegments[i]];
            if (originAirport === "") {
                originAirport = flightSegments[i].start_airport_code;
            }
            currentTerminus = flightSegments[i].end_airport_code;
            lastFlightEnd = Date.parse(makeDateTimeString(flightSegments[i].EndDateTime));
        } else {
            // if we already have found a flight, see if another flight starts in
            // 12 hours or less from the current (last found) aiport code and not 
            // ending at the original airport code..then we probably have a
            // connecting flight, filtering out quick round-trips (back to origin same day)
            var flightStartTime = Date.parse(makeDateTimeString(flightSegments[i].StartDateTime));
            if ((currentTerminus !== "") && (lastFlightEnd > 0)) {
                if (lessThanTwelve(lastFlightEnd, flightStartTime) &&
                    (currentTerminus === flightSegments[i].start_airport_code) &&
                    (flightSegments[i].end_airport_code !== originAirport)) {
                    //this appears to be a connecting flight to the first flight
                    currentTerminus = flightSegments[i].end_airport_code;
                    lastFlightEnd = Date.parse(makeDateTimeString(flightSegments[i].EndDateTime));
                    upcomingFlights.push(flightSegments[i]);
                }
            }
        }
    }
    return upcomingFlights;
}

function sortFlightSegments(a, b) {
    var datetimeA = Date.parse(makeDateTimeString(a.StartDateTime));
    var datetimeB = Date.parse(makeDateTimeString(b.StartDateTime));
    return datetimeA - datetimeB;
}

function makeDateTimeString(tripitDateTimeObj) {
    return tripitDateTimeObj.date + "T" + tripitDateTimeObj.time + tripitDateTimeObj.utc_offset;
}

function sortTrips(a, b) {
    return Date.parse(a.start_date) - Date.parse(b.start_date);
}

function lessThanTwelve(flightEnd, flightStart) {
    if ((flightStart - flightEnd) <= 12 * 60 * 60 * 1000) {
        return true;
    }
    return false;
}
//returns whether today is within a day of a start date or prior/equal to end
function isSoonOrWithin(today, start, end) {
    if (((start - today) <= 24 * 60 * 60 * 1000) && ((end - today) >= 0)) {
        return true;
    }
    return false;
}

function inNextDay(today, start) {
    if ((start - today) < 0) {
        //already in the past
        return false;
    }
    // check next 24 hours
    if ((start - today) <= 24 * 60 * 60 * 1000) {
        return true;
    }
    return false;
}

$(document).ready(function() {
    // set up handlers to load weather and flight info
    $('#flight-results').on("instantiate", 'div.flightstatInfo', function(e) {
        // ID format = 'flightstats:AA:nnnn:date:BBB:CCC' where
        //   AA   = airline shortcode
        //   nnnn = flight number
        //   date = flight depart date as "YYYY-MM-DD"
        //   BBB  = origin airport code
        //   CCC  = destination airport code
        var infoArray = this.id.split(":");
        var idStatus = "fstatus-" + infoArray[0] + "-" + infoArray[1] + "-" + infoArray[5];
        $(this).append("<div id='" + idStatus + "' class='statusDetail'></div>");
        $(this).css("display", "block");
        var divID = this.id;
        var qURL = "/i/flightinfo?airline=" + infoArray[1] + "&flightnum=" + infoArray[2] + "&date=" + infoArray[3] +
            "&airport=" + infoArray[5]; // default lookup direction is "arriving" so put destination airport
        ajaxCall(qURL, "GET", function(respData) {
            // call flightstats endpoint and fill in current known flight status
            var flightStatus = "unknown";
            var flightEquipment = "unknown equipment";
            var flight = infoArray[1] + infoArray[2];
            if (!isEmpty(respData.flights)) {
                flightStatus = respData.flights[0].status.description;
                flightEquipment = respData.flights[0].equipment.scheduled.name;
            }
            $('#' + idStatus).html("<span class='flightStatsStatus'>" +
                flight + " Status:</span> " + flightStatus + " on equipment: " + flightEquipment);
        });
    });

    $('#flight-results').on("instantiate", 'div.weatherInfo', function(e) {
        // ID format = 'weather:AA:nnnn:BBB:lat:lon:CCC:lat:lon' where
        //   AA   = airline shortcode
        //   nnnn = flight number
        //   BBB  = origin airport code + latitude and longitude
        //   CCC  = destination airport code + latitude and longitude
        var infoArray = this.id.split(":");
        // get weather for the origin and destination cities from our API
        var idOrigin = "weather" + infoArray[3] + "-" + infoArray[1] + infoArray[2];
        $(this).append("<div id='" + idOrigin + "' class='weatherData'></div>");
        var idDest = "weather" + infoArray[6] + "-" + infoArray[1] + infoArray[2];
        $(this).append("<div id='" + idDest + "' class='weatherData'></div>");
        $(this).css("display", "block");

        var origURL = "/i/weather?locID=" + infoArray[3] + "&lat=" + infoArray[4] + "&lon=" + infoArray[5];
        var destURL = "/i/weather?locID=" + infoArray[6] + "&lat=" + infoArray[7] + "&lon=" + infoArray[8];
        showCityWeatherInfo(origURL, infoArray[3], idOrigin);
        showCityWeatherInfo(destURL, infoArray[6], idDest);
    });

    $("#flight-alternates").on("instantiate", function(e) {
        $('#throbber-div-2').css("display", "block");
        // first we need the data from our dynamically added child div to make the query..
        var childDiv = $(this).children("div");
        var infoArray = childDiv[0].id.split("_");
        // default to 12 hours of search from depart time; 25 total results max
        outputAlternateFlights(childDiv[0], infoArray[0], infoArray[1], infoArray[2], 12, 25);
    });
});

function filterFlights(alternateFlights) {
    var altFlights = [];
    var curFlightDivs = $('div.flightstatInfo');
    // we will store a string representing the current flight identifiers in order of the
    // current ticketed trip so we can filter it out of the results
    var curFlightPath = "";
    for (var f = 0; f < curFlightDivs.length; f++) {
        var idParts = curFlightDivs[f].id.split(":");
        curFlightPath = curFlightPath + idParts[1] + idParts[2];
    }
    // create map of airport names and timezone data for showing time/date properly
    var airportTZData = {};
    for (var g = 0; g < alternateFlights.appendix.airports.length; g++) {
        var airportName = alternateFlights.appendix.airports[g].fs;
        var offsetHrs = "" + alternateFlights.appendix.airports[g].utcOffsetHours;
        // API returns items like "-4"; we need "-04:00"; make the modifications to the string
        offsetHrs = offsetHrs.substr(0, 1) + "0" + offsetHrs.substr(1) + ":00";
        airportTZData[airportName] = offsetHrs;
    }
    for (var i = 0; i < alternateFlights.connections.length; i++) {
        // generate the flight order and compare to current ticketed trip; removing it
        // if it matches; done in called function for code clarity
        route = createAlternateRoute(alternateFlights.connections[i], curFlightPath, airportTZData);
        if (!isEmpty(route)) {
            altFlights.push(route);
        }
    }
    return altFlights;
}

function createAlternateRoute(connectionEntry, curFlightPath, airportTZData) {
    var route = {
        elapsedTime: humanElapsedTime(connectionEntry.elapsedTime),
        score: connectionEntry.score,
    };
    var flightPath = "";
    var flights = [];
    for (var i = 0; i < connectionEntry.scheduledFlight.length; i++) {
        var fInfo = connectionEntry.scheduledFlight[i];
        var flightIdent = fInfo.flightNumber;
        if (!isEmpty(fInfo.codeshares)) {
            // because we queried with "includeCodeshares = false", any detail in codeshares
            // means we have a "express" route where the 'real' airline is listed as a codeshare
            // So, to match properly what the user expects, we will grab the airline code from
            // the codeshares details:
            flightIdent = fInfo.codeshares[0].carrierFsCode + flightIdent;
        } else {
            flightIdent = fInfo.carrierFsCode + flightIdent;
        }
        flightPath = flightPath + flightIdent;
        // clean up messy flight depart/arrive time representation
        var departParts = fInfo.departureTime.split(".");
        var departTime = departParts[0] + airportTZData[fInfo.departureAirportFsCode];
        var arriveParts = fInfo.arrivalTime.split(".");
        var arriveTime = arriveParts[0] + airportTZData[fInfo.arrivalAirportFsCode];
        // create the flight object representation
        var flight = {
            flightID: flightIdent,
            departureAirport: fInfo.departureAirportFsCode,
            arrivalAirport: fInfo.arrivalAirportFsCode,
            departs: niceDate(new Date(Date.parse(departTime))),
            arrives: niceDate(new Date(Date.parse(arriveTime))),
            duration: humanElapsedTime(fInfo.elapsedTime),
        };
        flights.push(flight);
    }
    if (curFlightPath === flightPath) {
        // this is the ticketed existing route; don't show as an alternative
        return {};
    }
    route.flights = flights;
    route.flightPath = flightPath;
    return route;
}

function outputAlternateFlights(outputElement, depAirport, arrAirport, date, hours, numResults) {
    var qURL = "/i/conninfo?depairport=" + depAirport + "&arrairport=" + arrAirport + "&numhours=" +
        hours + "&results=" + numResults + "&date=" + date + "&includeCodeshares=false";
    ajaxCall(qURL, "GET", function(respData) {
        // need to filter the results to get rid of duplicate to our existing flight
        // reservation and any other possible filtering (codeshares should be removed by the query)
        alternativeFlights = filterFlights(respData);
        $('#throbber-div-2').css("display", "none");
        $('#flight-alternates').css("display", "block");
        // run the results through a mustache template and display in the output div

        var resultsStart = "<div class='resultsHeader'>Alternate route options between " +
            "<span class='airportId'>" + depAirport + "</span> and <span class='airportId'>" +
            arrAirport + "</span>:</div><div class='resultsContainer'>";
        var htmlOut = "";
        for (var i = 0; i < alternativeFlights.length; i++) {
            // output each option in a separate div with a numbered title
            var opener = "<div class='altoption' id='" + alternativeFlights[i].flightPath + "'>" +
                "<div class='optionitem'>Option #" + (i + 1) + " (Total duration: " + alternativeFlights[i].elapsedTime + ")</div>";
            var results = { searchResults: alternativeFlights[i].flights };
            var resultsTmpl = "{{#searchResults}}\n" +
                "<div class='altflightid'>{{flightID}} <span class='flighttime'>{{duration}}</span></div>" +
                "<div class='altflightresults'>" +
                "<span class='airportFrom'>{{departureAirport}}</span>&nbsp;\u21D2&nbsp;<span class='airportTo'>{{arrivalAirport}}</span>" +
                "</div>" +
                "<div class='altflightTime'><span class='fieldTitle'>Departs:</span> {{departs}}</div>" +
                "<div class='altflightTime'><span class='fieldTitle'>Arrives:</span> {{arrives}}</div>\n" +
                "{{/searchResults}}";

            htmlOut = htmlOut + opener + Mustache.render(resultsTmpl, results) + "</div>";
        }
        $(outputElement).html(resultsStart + htmlOut + "</div>");
    });
}

function humanElapsedTime(minutes) {
    if (minutes < 60) {
        return "" + minutes + " min";
    }
    if (minutes < 120) {
        return " 1 hr, " + (minutes - 60) + " min";
    }
    return "" + Math.floor(minutes / 60) + " hrs, " + Math.round(minutes % 60) + " min";
}

function niceDate(dObj) {
    var month = twoDigitString(dObj.getMonth() + 1);
    var day = twoDigitString(dObj.getDate());
    var year = dObj.getFullYear();
    var min = twoDigitString(dObj.getMinutes());
    var ampm = "am";

    var hr = dObj.getHours();
    if (hr > 12) {
        hr = hr - 12;
        ampm = "pm";
    }
    if (hr == 12) {
        ampm = "pm";
    }
    if (hr === 0) {
        hr = 12;
    }
    var hour = twoDigitString(hr);

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ampm;
}

// helper function for displaying weather data in a specific DIV for an airport city code
function showCityWeatherInfo(url, cityCode, divID) {
    ajaxCall(url, "GET", function(respData) {
        // call weather endpoint and fill in "narrative" response into div
        for (var i = 0; i < respData.forecasts.length; i++) {
            if (respData.forecasts[i].num == 1) {
                if (!isEmpty(respData.forecasts[i].day)) {
                    $('#' + divID).html("<span class='weatherCity'>" +
                        cityCode + "</span> " + respData.forecasts[i].day.narrative);
                } else {
                    $('#' + divID).html("<span class='weatherCity'>" +
                        cityCode + "</span> " + respData.forecasts[i].night.narrative);
                }
            }
        }
    });
}

function twoDigitString(number) {
    var str = "" + number;
    if (str.length === 1) {
        str = "0" + str;
    }
    return str;
}

function ajaxCall(url, method, resultFn) {
    $.ajax({
        method: method,
        url: url,
        cache: false,
    }).done(function(results) {
        resultFn(results);
    });
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}
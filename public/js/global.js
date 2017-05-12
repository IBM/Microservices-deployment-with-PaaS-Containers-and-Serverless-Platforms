/* global ConversationPanel: true */
/* eslint no-unused-vars: "off" */

// Other JS files required to be loaded first: apis.js, conversation.js
(function() {
    // Initialize all modules
    ConversationPanel.init();
})();

// nasty globals for state
var tripRetrieved = false;
var alternatesRetrieved = false;
var problemState = {};

// this function handles responses from the Watson conversation service
// and optionally uses intents and e
function handleResponseMessage(incomingMsg) {
    var response = incomingMsg;
    for (var i = 0; i < response.intents.length; i++) {
        var intent = response.intents[i];
        var handled = false;
        switch (intent.intent) {
            case "when":
                if (intent.confidence > 0.5) {
                    response = handleWhen(response);
                    handled = true;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
            case "alternate":
                if (intent.confidence > 0.5) {
                    response = handleAlternate(response);
                    handled = true;
                    break;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
            case "problem":
                if (intent.confidence > 0.5) {
                    response = handleProblem(intent, response);
                    handled = true;
                    break;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
        }
        if (handled) {
            break;
        }
    }
    return response;
}

function handleWhen(response) {
    if (tripRetrieved === true) {
        $('#flight-alternates').css("display", "none");
        $('#flight-results').css("display", "block");
    } else {
        parseTripsForFlights(false, false);
        tripRetrieved = true;
    }
    response.output.text = "I've loaded your next trip details for you.";
    return response;
}

function handleAlternate(response) {
    if (!tripRetrieved) {
        parseTripsForFlights(false, true);
        tripRetrieved = true;
    }
    $('#flight-results').css("display", "none");
    if (alternatesRetrieved) {
        $('#flight-alternates').css("display", "block");
    } else {
        $('#flight-alternates').trigger('instantiate');
        alternatesRetrieved = true;
    }
    response.output.text = "I've loaded alternate flights between your origin and destination for you.";
    return response;
}

function handleProblem(intent, response) {
    // first check if the conversation service has a response (to clarify information):
    if (response.output.text.length > 0) {
        problemState = response;
        return response;
    }
    var airport = "";
    if (response.entities.length > 0) {
        if (response.entities[0].entity === "Airport") {
            // user has responded with an airport:
            airport = response.entities[0].value; // this will be the official entity name
        }
    }
    if (airport !== "") {
        var childDiv = $("#flight-alternates").children("div");
        response.output.text = "Let me see if I can help you get from " + airport + " to your destination via an alternate flight.";
		// BIG FIXME: Due to time constraints, for our DockerCon demo with the
		// conversation service, we hardcoded Austin and the date to show a
		// lookup specific to a story we were telling about Lin's canceled flight
		// FIX: actually parse the known trip JSON to find where the traveler is
		// going and use the date of "now" or that original flight date/time to
		// do the alternate search.
        outputAlternateFlights(childDiv[0], airportCode(airport), "AUS", "2017-04-18T13:00:00-05:00", 12, 15);
    } else {
        response.output.text = "I see you are having flight problems.";
    }
    return response;
}

function airportCode(cityEntity) {
    switch (cityEntity) {
        case "Dallas":
            return "DFW";
        case "Austin":
            return "AUS";
        case "Chicago":
            return "ORD";
        case "Raleigh":
            return "RDU";
        case "Charlotte":
            return "CLT";
        case "Charlottesville":
            return "CHO";
        default:
            return "Unknown";
    }
}

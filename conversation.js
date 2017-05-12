// communicate with Watson conversation micro-service

var restcall = require('./restcall.js');
var url = require('url');

module.exports = {
    // requires input in the query string:
    // - context = context information
    // - message = textual message
    Message: function(req, resp) {
        // send/receive message from the Watson conversation service
        if (process.env.DEVMODE === "true" && process.env.DEPLOY !== "swarm") {
            host = "localhost";
        } else {
            host = "conversation-service";
        }

        var options = {
            host: host,
            port: 6000,
            path: "/message/",
            method: "POST",
            rejectUnauthorized: false
        };

        var postdata = {
            "context": req.body.context,
            "input": req.body.input,
        };

        //send the request to the Conversation microservice API
        restcall.post(options, false, postdata, function(respData) {
            // response data will be sent back to our query
            console.log("sending JSON conversation response: " + JSON.stringify(respData));
            resp.send(respData);
        });

    }
};
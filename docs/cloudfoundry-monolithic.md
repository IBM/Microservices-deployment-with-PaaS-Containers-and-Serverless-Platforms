# 2. Deploy monolithic Flightassist application using Cloud Foundry

In this scenario, we will deploy Flightassist as a monolithic application and host it on Cloud Foundry.

First, install [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html).

Then, type the following commands to push your application with your own unique application name.

```bash
cf push {your_unique_app_name} -f main_application/manifest.yml
```

Now, go to https://console.ng.bluemix.net/dashboard/apps and select your application. Click the *Runtime* settings for your application and add these four environment variables to set up external credentials to the TripIt and FlightStats services:
   - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
   - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
   - `TRIPIT_API_KEY` : API key assigned by TripIt
   - `TRIPIT_API_SECRET` : API secret assigned by TripIt
   - `BASE_URL`: You URL for accessing your application. e.g. https://{app_name}.mybluemix.net/

Your application should restart automatically but can be done manually as well
in the UI. With the service bindings and added environment variables, the
application should be operational at the hostname route you selected for your CF
application. 

Congratulation, now you can learn about [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.
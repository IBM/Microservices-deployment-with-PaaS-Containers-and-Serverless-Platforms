# Deploy Flightassist microservices on Cloud Foundry

Make sure you have both developer accounts mentioned in prerequisites. Also make sure you have cloudant and weatherinsights services created as listed in [step 1](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms#1-create-your-cloudant-database-and-insights-for-weather-service).

In this scenario, we take the Flightassist which is factored to use the weather microservice. Since Cloud Foundry apps (warden containers) are not allowed to talk privately, they need to communicate via public route.

We first push the python microservice.
```
bx app push {your_unique_proxy_name} -f flightassist-weather/manifest.yml
```
> Note: If you want to use `cf` commands, please install [cloudfoundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) and replace all the `bx app push` command with `cf push`

**make sure you pick a unique name for the app.**   
This will bring up the first app we need.
The output should look like:
```
requested state: started
instances: 1/1
usage: 256M x 1 instances
urls: {proxy_name}.mybluemix.net
last uploaded: Thu Jun 8 21:36:15 UTC 2017
stack: unknown
buildpack: python_buildpack
```
And we need the **urls** for next step.   
Now we will push the second app, but **without starting** it.
```
bx app push {your_unique_app_name} -f main_application/manifest.yml --no-start
```
**make sure you pick a unique name for the app, too.**

Now we inject the environment variables as in monolithic deployment:
 - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
 - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
 - `TRIPIT_API_KEY` : API key assigned by TripIt
 - `TRIPIT_API_SECRET` : API secret assigned by TripIt
 - `BASE_URL`: You URL for accessing your application. In the format **https://**{name2}**.mybluemix.net/**

Plus, a couple more since we have two apps:
 - `USE_WEATHER_SERVICE`: true
 - `MICROSERVICE_URL`: {proxy_name}.mybluemix.net

Now we start the 2nd app:
`bx app start {app_name}`

You can now test the apps by going to http://{app_name}.mybluemix.net


## Takeaway points
To push an app, we simply use `bx app push` or `cf push` command. There is no container image or repository involved. Cloud Foundry has wide inventories of build packs to support different programming languages. If you run `cf marketplace`, you can find the huge list of services provided by Bluemix that can easily be consumed by your application. When pushing multi apps that need to communicate to each other, however, it is a little hacky. Another common alternative to creating public routes and sharing through environment variables as used in this example, is to bind a message queue service for communication.

# Code Structure

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](../main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats, tripIt, and weather information, shared by all deployment options |
| [app.py](../flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [Procfile and requirements.txt](../flightassist-weather/)| Description of the microservice to be deployed |
| [package.json](../main_application/package.json)     | List the packages required by the application |
| [manifest.yml](../main_application/manifest.yml)     | Description of the application to be deployed |

# Deploy Flightassist microservices on Cloud Foundry

Make sure you have both developer accounts mentioned in prerequisites. Also make sure you have cloudant and weatherinsights services created as listed in [step 1](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms#1-create-your-cloudant-database-and-insights-for-weather-service). 

In this scenario, we take the Flightassist which is factored in microservices. Since Cloud Foundry apps (warden containers) are not allowed to talk privately, they need to communicate via public route.

We first push the python microservice.
```
bx app push <name1> -f path-to/flightassist-weather/manifest.yml
```
> Note: If you want to use `cf` commands, please install [cloudfoundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) and replace all the `bx app push` command with `cf push`

**make sure you pick a unique name for the app.**   
This will bring up the first app we need.
The output should look like:
```
requested state: started
instances: 1/1
usage: 256M x 1 instances
urls: <name1>.mybluemix.net
last uploaded: Thu Jun 8 21:36:15 UTC 2017
stack: unknown
buildpack: python_buildpack
```
And we need the **urls** for next step.   
Now we will push the second app, but **without starting** it.
```
bx app push <name2> -f path-to/main_application/manifest.yml --no-start
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
 - `MICROSERVICE_URL`: <i>name1</i>.mybluemix.net
 
Now we start the 2nd app:
`bx app start <name2>`

You can now test the apps by going to http://<i>name2</i>.mybluemix.net


## Take away points
To push an app, we simply use `cf push` command. There is no container image or repository involved. Cloud Foundry has wide inventories of build packs to support different programming languages. If you run `cf marketplace`, you can find the huge list of services provided by Bluemix that can eaisly be consumed by your application. When pushing multi apps that needs to communite to each other, however, it is a little hacky. Another common pratice than the environment variables we used in this example, is to bind a message queue service.

# Code Structure

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats, tripIt, and weather information, shared by all deployment options |
| [app.py](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [Procfile and requirements.txt](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/tree/master/flightassist-weather/)| Description of the microservice to be deployed |
| [package.json](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/package.json)     | List the packages required by the application |
| [manifest.yml](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/manifest.yml)     | Description of the application to be deployed |
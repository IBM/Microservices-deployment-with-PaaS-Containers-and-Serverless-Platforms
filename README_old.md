# flightassist
Flightassist is a Node.js example application for demonstrating and
comparing various application deployment technologies in the IBM Bluemix
public cloud.

The intent for this project, when complete, is that it will be
deployable as a Cloud Foundry application, a containerized application
using at least one factored-out microservice, and as a set of
functions deployable to OpenWhisk, the IBM Bluemix function-as-a-service
offering.

Specifically, a set of trade-offs and comparisons can be made between
these deployment models, and this application is a proving ground for
those discussions. This will be the basis for the talk given by
Lin Sun and Phil Estes at [IBM Interconnect 2017](https://www.ibm.com/cloud-computing/us/en/interconnect/)
titled [Containerize, PaaS, or Go Serverless? A Case Study in
Application Deployment Models](https://myibm.ibm.com/events/interconnect/all-sessions/session/4467A).

## Development configuration

This application relies on four distinct services; two of which are
available in the IBM [Bluemix service catalog](https://console.ng.bluemix.net/catalog/):
the [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/) and
The [Weather Company weather data](https://console.ng.bluemix.net/catalog/services/weather-company-data/) service. You can use the free tier
variants of both of these services and connect them to your Bluemix
hosted CF application.

The two non-Bluemix services used are API credentials for [TripIt](https://www.tripit.com/developer) and
[FlightStats](https://developer.flightstats.com/api-docs/).

> Note that the application uses the *Connections* API for FlightStats,
> which is only available under a 30-day trial license key, or under
> a commercial premium account with FlightStats.

For detailed deployment guides for the various application models
supported in the **flightassist** code and configuration, see the
[Deployment Guides section](#deployguides) below.

## Application design/layout

The "CF mode" of the application is as a single Node.js application
on the server, providing multiple HTTP endpoints for data/API access
from a live "AJAX"/HTML5 web front-end.

The application flow starts with an Oauth2-based authentication
step against the TripIt API (see the `/authorize` handler). Since we are wanting to query a user's
set of upcoming trips, the user authorizes our application to their
TripIt data via this Oauth2 flow.

On authentication success, the callback URL provided to TripIt will
start the query of trip data at our `/flights` endpoint, beginning
by storing the access tokens in the HTTP session and accessing the
user's TripIt profile for basic user details.

At the end of the `/flights` handling the results page is rendered
which will begin the use of AJAX callbacks into the application,
which will use the stored token data in the session for further
calls to TripIt.

The first callback simply calls `/tripdata` to perform a pull of
the user's trip data from TripIt which we will post-process and
cache into Cloudant. Because of our cache, only flight changes will
cause us to update, and a timestamp will decrease our round-trips
to TripIt to only request "updated since" content.

> TODO: We do have to add a remove trips sweep on some interval as
> the TripIt API recommendations note that trip deletion is not
> provided in the "updated since" API flow. Without this, a user
> might be shown a trip which they have already deleted in TripIt.

Our processing of TripIt data throws away all information except for
"air segment" data, as our application only shows details related to
flights. This decreases our cacheing and resolution of updates when
round-tripping to TripIt for any recent updates.

On the client side, the `trips.js` client script will take the
results of the `/tripdata` AJAX call and fill out a results section
with either a notification that no upcoming trips were found, or
that the next trip is over 24 hours in the future. Our application
is most useful when a trip is starting soon, as it will update the
user about potential flight issues and show alternate connecting
routes between their origin and destination airports.

If the user **does have** an upcoming flight within the next 24 hours
those flights will be displayed and a series of AJAX callbacks will
begin to gather weather and flight status data for the results.
Weather data will be cached given our free tier API key will quickly
exhaust its API limits.

As results are gathered client-side from the `/weather`, `/conninfo`, and
`/flightinfo` endpoints, the results display will be updated with
this additional information for the user of the application.

### Containerized application model

The first common step to containerize an existing application is to use
a strategy termed "lift and shift." Just like how it sounds, you simply
take the application as-is and place it inside a container image with the
same basic application characteristics and requirements. You gain the
ability to now use it in various more complex deployment flows that use
container images, but other than that you've left the application unchanged.

For **flightassist**, you can run the containerized version in a local
environment (assuming you have the docker client installed and configured)
by using the `localctr` Makefile target.

> **Note**: Because you don't have a cloud foundry instance handling environment
> configuration, similar to running on your local system in development mode
> you will need to copy the `dot-env` file to `.env` and insert all required
> API keys and secrets/configuration parameters in this local file. This
> `.env` file is ignored by `git` in this repo configuration and therefore
> saves you the embarrassment of checking in a set of secrets/credentials.

A `Makefile` has been created for automating simple `docker build` and `docker run`
steps on your local system. Simply use `make localctr` to build and run
the image from your local clone of this repo after creating the `.env` file
and populating it with the required information.

Alternatively, if your local shell is set up and authenticated to the IBM
Bluemix container service, you can use the `make bxdeploy` target. You must have the
local shell configured with `DOCKER_HOST` for this to use the IBM container
service as the target Docker engine. See this [documentation on the client
configuration](https://console.ng.bluemix.net/docs/containers/container_cli_cfic_install.html) in Bluemix to configure these variables. If the `cf ic` tools are already installed and your command
line is already set up/logged in you can use `cf ic init` to display
the three environment variables you need to export to use your `docker` client
targeting the IBM container service. To simplify your workflow, you may add
these variables to the `.env` file and then the `Makefile` targets interacting
with the Bluemix container service will work without any extra configuration.

#### Microservices

Given this "lift and shift" model is just a stepping stone to more adantageous
use of containerized architectures, we've taken the weather endpoint from
the Node.js application and created a separate containerized microservice for
retrieving weather data. Because containers and microservices decouple our
application components, you'll notice that our weather microservice does not
need to be written in Node.js nor does it use any of the same dependencies of
our monolithic application. In this case, we've used Python as a simple language
in which to write the weather data retrieval service.

You can find the code for our weather microservice
in the [flightassist-weather](https://github.com/estesp/flightassist-weather) Github repository.

Of course, the fact that we can develop these microservices in a parallel but
separate space means we can improve the weather service or refactor it, or 
change its backend data source without impacting development of the main application.

### FaaS application model

Similar to our initial baby step to break out the weather API query
into a microservice, our FaaS model takes that same capability (our
weather lookup) and offloads it to an OpenWhisk-based action in IBM
Bluemix. Because the OpenWhisk system packages already include a weather
forecast lookup using our same IBM Weather Insights API credentials, it was
simple to call this OpenWhisk action via its default HTTP endpoint already
available in the OpenWhisk ecosystem through this default system package.

It would be interesting to continue to grow the use of FaaS in **flightassist**
by writing new actions in OpenWhisk that handle the entire cache lookup,
external API query (if needed), and cache update/formatted response work
as a single callable action.

## <a name="deployguides"></a>Deployment Guides

The following sections provide specific step-by-step guides for deploying
**flightassist** using the various models described to this point.

### External service pre-requisites

All deployment methods require credentials for a set of services used
by the application.  Without these service configurations and their
credentials the application will not work properly.

The first two services are part of IBM's Bluemix cloud service catalog. To
create instances of these services for free, you can create a 30-day trial
account at this [Bluemix sign-up page](https://console.ng.bluemix.net/registration/).

Once you have a Bluemix account, you can create "Free tier" instances of
both a Cloudant NoSQL database and the Weather Insights API. For simplicity,
links to these services are below:

 * [The Cloudant NoSQL database service](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db?env_id=ibm:yp:us-south)
 * [Weather Company Data, also known as Weather Insights](https://console.ng.bluemix.net/catalog/services/weather-company-data?env_id=ibm:yp:us-south)

> **Note:** Cloud Foundry power users will know that you can create service
> instances via the `cf` command line tool.

Once you have created free tier instances of these services, you can view
your credentials and, for each, copy the *url* variant of the credential info
in the next steps when asked for the `WEATHER_URL` or `CLOUDANT_URL`.

Before moving on, the demo application is missing code to create the databases used
to cache API responses in your newly created Cloudant instance. One simple way
to make sure these databases are initialized is through the Bluemix console UI.
Go to your new Cloudant service and open the Cloudant UI console using the link from your
service instance page. Once at the Cloudant console you will need to
create the **trips**, **weather**, and **connections** databases for
the cacheing code to work properly.

Note that if you deploy the application to Cloud Foundry in IBM Bluemix,
you will also create CF service bindings between your service instances
and the application you deploy, relieving you of the need to set up 
environmental parameters with the credential details. Information on that
step is below in the Cloud Foundry section.

With your two IBM Bluemix services instantiated with credentials assigned, you
will also be required to create a developer account for both the TripIt API and
the FlightStats API. The following links will take you to the appropriate signup
pages for these two developer APIs.

 * [TripIt Developer API](https://www.tripit.com/developer/create)
 * [FlightStats Developer API](https://developer.flightstats.com/signup)

When signing up for a FlightStats developer key, note that there is a
review process that may take 24 hours or more to get your application
credentials activated for a 30-day trial with the API.

Once you have valid credentials to all four services, you can use any of the
following application deployment models to use and demonstrate the application
behavior.

### Standalone Node.js monolithic application

To run **flightassist** as a standalone Node.js application, the system
on which you want to run the application requires an installation of Node.js/npm
utilities and optionally `make` (to utilize the `Makefile` targets set up
for ease of deployment configuration).

 1. Clone this repository: `git clone https://github.com/estesp/flightassist`
 2. Copy `dot-env` to `.env`: `cd flightassist && cp dot-env .env`
 3. Edit `.env` and fill in all required credentials from your four services
 4. Leave `DEVMODE` and `DEV_URL` as set as this will allow the local deployment
 5. Read about the rest of the variables; make sure `USE_WEATHER_SERVICE=false`
 6. If using the `Makefile` type `make localdeploy` to run npm and start the Node application.

If you performed the setup steps correctly, you now have a working application which
you can visit locally via http://localhost:3000 in your browser.

### Cloud Foundry monolithic application hosted in IBM Bluemix

Pushing the Node.js application to Bluemix as a CF application is quite similar
to running the Node.js application locally. The main steps to perform are in the
Bluemix console for binding the Bluemix catalog service instances to your application
and setting up the external API credentials as environment variables.

Because we already have a `manifest.yml` in the root of the project, you can
get started by simply using `cf push` from the root of the repository:

 1. Clone the project: `git clone https://github.com/estesp/flightassist`
 2. Edit `manifest.yml` and select your own application name and `host`. Since my application instance already owns the route `flightassist` on `mybluemix.net` you will have to select a unique name.
 3. Edit `flightassist.js` to set the `baseURL` variable (around line 16) to your selected CF route hostname.
 4. Either type `cf push` after making these edits or `make cfdeploy` to do the same action.
 5. Once your application is deployed, you need to make service bindings; go to the Bluemix console, open your application and use the UI to bind your two Bluemix services (Cloudant and Weather Data) to your application.
 6. Go to the *Runtime* settings for your application and add these four environment variables to set up external credentials to the TripIt and FlightStats services:
   - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
   - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
   - `TRIPIT_API_KEY` : API key assigned by TripIt
   - `TRIPIT_API_SECRET` : API secret assigned by TripIt

Your application should restart automatically, but can be done manually as well
in the UI. With the service bindings and added environment variables, the
application should be operational at the hostname route you selected for your CF
application. Note that the `FORCE_FLIGHT_VIEW` variable can optionally be set to `true`
as an added environment variable for demonstrating the application function even
if no flights are upcoming in the next day with the TripIt user credentials
authorized via the application.

### Local Docker container deployment as a monolithic application

To deploy the application wholesale in a Docker container, the project
already includes a simple "lift and shift" `Dockerfile` that 
packages the application very similar to the standalone model already
discussed. The only benefit is that the image can be reused and doesn't
force the local system to have any of the Node.js SDK dependencies
installed.

 1. Clone the project: `git clone https://github.com/estesp/flightassist`
 2. Copy `dot-env` to `.env`: `cd flightassist && cp dot-env .env`
 3. Edit `.env` and fill in all required credentials from your four services
 4. Leave `DEVMODE` and `DEV_URL` as set as this will allow the local deployment
 5. Read about the rest of the variables; make sure `USE_WEATHER_SERVICE=false`
 6. Use the `Makefile` to perform the `docker build` and `docker run`: `make localctr`
 7. Note you can also build/rebuild the container image using the `Makefile`: `make localimage`

Very similar to the standalone non-containerized application version,
you can visit http://localhost:3000 and use the application as this
port is exposed from the running container.

### IBM Container Service (legacy) deployment as a monolithic application

You can also use the legacy IBM Container Service capability to point your
`docker` client at the hosted public container service API endpoint and
registry and deploy the same single container runtime, and have public IP
address assignment, simple container group (scaling) capability, and image vulnerability
scanning.  The steps are the same as running Docker locally with the following
changes:

 1. Make sure you are logged in with the `cf ic login` command (Requires the IBM Container Service plugin)
 2. Get the required settings for the `DOCKER_HOST` and other variables (re-run `cf ic init` to have them displayed in your terminal) and place them in the appropriate locations in your `.env` file.
 3. Assuming you have your environment configured properly, you can now type `make bxdeploy` to build your container image, tag and push it to the IBM private registry and then run it in the IBM container service.

Now that IBM Bluemix has released the Kubernetes-based cluster capability for the
IBM Container Service in beta, see the Kubenetes deployment section below
for a more up-to-date method for deployment the microservice-based variant of
**flightassist** in this new Bluemix beta service.

### Docker Swarm-based micro-service based application deployment

With the advent of Docker Swarm in Docker 1.12 and above, you can use a
recent installation of the Docker engine with Swarm enabled (`docker swarm init`)
and the new Docker Compose v3.1 format to deploy **flightassist** as
a containerized micro-service-using application onto a Swarm cluster.

This deployment will use the new `docker secret` and `docker stack deploy`
capabilities of Docker 1.13.1 and above, so the minimum required Docker
version is 1.13.1. Docker for Mac updated to the most recent edition is
a great way to try this out.

 1. Clone the project: `git clone https://github.com/estesp/flightassist`
 2. Copy `dot-env` to `.env`: `cd flightassist && cp dot-env .env`
 3. Edit `.env` and fill in all required credentials from your four services
 4. Uncomment `DEPLOY` and set the value to `swarm`
 5. Make sure `export USE_WEATHER_SERVICE=true` is uncommented
 6. Clone the weather microservice project: `git clone https://github.com/estesp/flightassist-weather`
 7. Enter that project directory and type: `make localimage` to get the image built (depended on by the compose service definition)
 8. Go back to the root of the `flightassist` repo and type `make swarmdeploy`. This will first create the secrets using the values you have placed in `.env` using the `docker secret create` command and then use the `docker stack deploy` command to bring up your two services in the Swarm.

The application should be available now on http://localhost, assuming you are using a local
Docker edition (like Docker for Mac) or a locally installed Docker
daemon on a Linux system. If the application is hosted on a known IP or host, you can
modify the `docker-compose.yaml` file with those details and access the application
on that host/IP information. All the standard Swarm tools can be used to view logs
or validate that the services are up and running properly.

### Docker + Kubernetes based application deployment (minikube)

The *yaml* files for a Kubernetes deployment of the weather microservice and
the main application have been created in the base repository and tested.

Concrete instructions for making a local deployment with **minikube** is coming soon.

### Docker + Kubernetes based application deployment (IBM Container Service beta)

The *yaml* files exist in the repository for creating a Kubernetes deployment
with the weather microservice and the main application. 

1. Follow the create kubernetes cluster tutorial to create the kubernetes cluster in IBM Container service [https://console.ng.bluemix.net/docs/containers/cs_tutorials.html#cs_tutorials].

2. Create the cloudant and weather insight service if you don't have them deployed yet:
  * ```bx service create cloudantNoSQLDB Lite mycloudant```
  * ``` bx service create weatherinsights Free-v2 myweatherinsights```

3. Bind the two services to the kubernete cluster deployed earlier:
  * ```bx cs cluster-service-bind {your-cluster-name} default mycloudant```
  * ```bx cs cluster-service-bind {your-cluster-name} default myweatherinsights```

  The examples above use the default kubernetes namespace and you could choose a different namespace.

4. Modify the secret.yaml file with flightstats-app-id, flightstats-app-key, tripit-api-key, and tripit-api-secret.

5. Edit the flightassist.yaml and replace the ```<namespace>``` with your own namespace.  Also replace <your-app-end-point-url> with the endpoint of the application.  If you are using the free cluster provided by IBM Container service, this is your node ip and nodeport, e.g. 169.47.237.139:30080

5. Deploy the secret and deployment:
  * ```kubectl create -f secret.yaml```
  * ```kubectl create -f flightassist.yaml```
  
### Existing application deployment + OpenWhisk action for Weather API

Instead of using the weather microservice container, the code allows us
to utilize any of the "monolith" deployment models (standalone, hosted CF,
or containerized), but use an OpenWhisk action to handle the weather
forecast query. Thanks to OpenWhisk built-in system packages, which includes
a weather API, we don't even have to write our own action to try it out with
a simple weather forecast lookup.

Use any of the above guides with the following changes to use the existing
OpenWhisk system action to call the Weather Insights API:

 1. Edit your `.env` and unset the `USE_WEATHER_SERVICE=true` if it was set
 (or set it to `false`)
 2. Uncomment the `export USE_WEATHER_SERVERLESS=true` (or add it if you don't
 have this variable copied in from the `dot-env` template)
 3. Login to the IBM Bluemix console and set up the [OpenWhisk client](https://console.ng.bluemix.net/openwhisk/cli), making sure
 to run the setup command to set the host and authentication parameters.
 4. Run `wsk property get --auth | awk  '{print $3}'` to get the authentication
 string from OpenWhisk and set a new variable in `.env`: `export OPENWHISK_AUTH=<auth-string` with
 the data you got back from the `get --auth` command.
 5. Run your deployment of **flightassist** and verify in your logs that the
 OpenWhisk action is being utilized to query the weather data for each airport.

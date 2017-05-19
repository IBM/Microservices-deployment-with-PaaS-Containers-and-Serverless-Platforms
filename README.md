# Containers vs PAAS vs Serverless

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

## Included Components
The scenarios are accomplished by using:

- [Cloud Foundry](https://www.cloudfoundry.org)
- [Kubernetes Clusters](https://console.ng.bluemix.net/docs/containers/cs_ov.html#cs_ov)
- [OpenWhisk](https://www.ibm.com/cloud-computing/bluemix/openwhisk)
- [Cloudant NoSQL Database](https://cloudant.com)
- [Insights for Weather](https://console.ng.bluemix.net/docs/services/Weather/weather_overview.html#about_weather)
- [TripIt Developer API](https://www.tripit.com/developer)
- [FlightStats Developer API](https://developer.flightstats.com)


## Prerequisites

Register and obtain the [TripIt Developer API](https://www.tripit.com/developer/create) and [FlightStats Developer API](https://developer.flightstats.com/signup) to query flight status. 

When signing up for a FlightStats developer key, note that there is a review process that may take 24 hours or more to get your application credentials activated for a 30-day trial with the API.

## Deploy using DevOps Toolchain (In progress)

Click the button to deploy your app and continue with one of the following scenarios.

[![Create Toolchain](https://github.com/IBM/container-journey-template/blob/master/images/button.png)](https://console.ng.bluemix.net/devops/setup/deploy/?repository=https://github.com/IBM/containers-paas-serverless)

### Toolchain Scenarios One: Monolithic Cloud Foundry Application.
Go to https://console.ng.bluemix.net/dashboard/apps and select your application. Click the *Runtime* settings for your application and add these four environment variables to set up external credentials to the TripIt and FlightStats services:
   - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
   - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
   - `TRIPIT_API_KEY` : API key assigned by TripIt
   - `TRIPIT_API_SECRET` : API secret assigned by TripIt
   - `BASE_URL`: You URL for accessing your application. e.g. {app_name}.mybluemix.net

### Toolchain Scenarios Two: Microservices or Serverless with Kubernetes Clusters.

Click **View logs and history** and access your application via the URL link at the end of your logs.


# Steps
1. [Create your Cloudant Database and Insights for Weather Service](#1-create-your-cloudant-database-and-insights-for-weather-service)
2. [Scenarios](#2-scenarios)

# 1. Create your Cloudant Database and Insights for Weather Service

We will use Bluemix's [The Cloudant NoSQL database service](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db?env_id=ibm:yp:us-south) and [Insights for Weather service](https://console.ng.bluemix.net/catalog/services/weather-company-data?env_id=ibm:yp:us-south) for our database and weather data. Therefore, run the following commands to create cloudant and Insights for Weather service. 

> For this example, we recommend you name your services to *mycloudant* and *myweatherinsights*.

```bash
bx service create cloudantNoSQLDB Lite mycloudant
bx service create weatherinsights Free-v2 myweatherinsights
```

Before moving on, the demo application is missing code to create the databases used to cache API responses in your newly created Cloudant instance. You can run the following commands with your cloudant URL to create the databases.

```bash
bx service keys mycloudant #This will output your {service key}
bx service key-show mycloudant {service key} #This will output your cloudant credential, "url" is Your cloudant URL
curl -k -X PUT {your-cloudantURL}/trips
curl -k -X PUT {your-cloudantURL}/weather
curl -k -X PUT {your-cloudantURL}/connections
```


# 2. Scenarios
- [Scenario One: Deploy Flightassist on Cloud Platform using Cloud Foundry](#scenario-one-deploy-flightassist-on-cloud-platform-using-cloud-foundry)
- [Scenario Two: Deploy Flightassist as containers using Docker Swarm and Kubernetes Clusters](#scenario-two-deploy-flightassist-as-containers-using-docker-swarm-and-kubernetes-clusters)
  - 1. [Docker Swarm](#1-docker-swarm)
  - 2. [Kubernetes Clusters](#2-kubernetes-clusters)
- [Scenario Three: Deploy Flightassist with Serverless using OpenWhisk](#scenario-three-deploy-flightassist-with-serverless-using-openwhisk)

After you deployed Flightassist using any platform, you can go to [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# Scenario One: Deploy Flightassist on Cloud Platform using Cloud Foundry

In this scenario, we will deploy Flightassist as a monolithic application and host it on Cloud Foundry.

First, install [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html).

Then, type the following commands to push your application with your own unique application name.

```bash
cf push {your_unique_app_name}
```

Now, go to https://console.ng.bluemix.net/dashboard/apps and select your application. Click the *Runtime* settings for your application and add these four environment variables to set up external credentials to the TripIt and FlightStats services:
   - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
   - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
   - `TRIPIT_API_KEY` : API key assigned by TripIt
   - `TRIPIT_API_SECRET` : API secret assigned by TripIt
   - `BASE_URL`: You URL for accessing your application. e.g. {app_name}.mybluemix.net

Your application should restart automatically, but can be done manually as well
in the UI. With the service bindings and added environment variables, the
application should be operational at the hostname route you selected for your CF
application. 

Congratulation, now you can learn about [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.


# Scenario Two: Deploy Flightassist as containers using Docker Swarm and Kubernetes Clusters

In this scenario, we want to break down Flightassist to multiple containers. Therefore, we will run Flightassist as our main application with weather-service as our microservice to query the weather data. Then, we will host those containers using Docker Swarm or Kubernetes. 

## 1. Docker Compose

First, install [Docker CLI](https://www.docker.com/community-edition#/download).

Next, rename the `dot-env` file to `.env` file. Add all the credentials for **FLIGHTSTATS_APP_ID**, **FLIGHTSTATS_APP_KEY**, **TRIPIT_API_KEY**,**TRIPIT_API_SECRET**,**CLOUDANT_URL**, and **WEATHER_URL** to your `.env` file.

Then, run the following commands to build your docker images and run Docker Swarm. 

```bash
docker build -f Dockerfile.local -t flightassist .
docker build -f flightassist-weather/Dockerfile.alpine -t weather-service flightassist-weather
./create-secrets.sh
docker stack deploy -c docker-compose.yaml flightassist #will changed to compose only later
```

Now, your FlightAssist application should be running on http://localhost/


## 2. Kubernetes Clusters

First, follow the [Kubernetes Cluster Tutorial](https://github.com/IBM/container-journey-template) to create your own cluster on Bluemix.

Then, install the container registry plugin for Bluemix CLI.

```bash
bx plugin install container-registry -r Bluemix
```
Next, build your own docker images and push them to your own bluemix container registry.

> Replace `<namespace>` with your own namespace, you can view your namespace by running `bx cr namespaces`
>
> If you have unauthorized error, run `bx cr login` to authorized your container-registry.

```bash
docker build -f Dockerfile.local -t registry.ng.bluemix.net/<namespace>/flightassist .
docker build -f flightassist-weather/Dockerfile.alpine -t registry.ng.bluemix.net/<namespace>/weather-service flightassist-weather
docker push registry.ng.bluemix.net/<namespace>/flightassist
docker push registry.ng.bluemix.net/<namespace>/weather-service
```

Then, you need to run the following commands to bind your Cloudant and Weather Insights services to your clusters. 

```bash
bx cs cluster-service-bind {your-cluster-name} default mycloudant
bx cs cluster-service-bind {your-cluster-name} default myweatherinsights
```

Next, modify the secret.yaml file with **flightstats-app-id**, **flightstats-app-key**, **tripit-api-key**, and **tripit-api-secret**.

Then, edit the `flightassist.yaml` and replace the ```<namespace>``` with your own namespace. You can obtain your namespace by running `bx cr namespace`. Also replace `<your-app-end-point-url>` with your node ip and nodeport (e.g. 169.47.237.139:30080). You can obtain your IP by running `kubectl get nodes` and your nodeport is 30080.

Lastly, run the following commands to deploy the secret and deployment.

```bash
kubectl create -f secret.yaml
kubectl create -f flightassist.yaml
```

Congratulation, now your Flightassist application should be running on `http://<your_node_ip>:30080`. You can go to [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# Scenario Three: Deploy Flightassist with Serverless using OpenWhisk

In this scenario, we will deploy Flightassist with serverless to show how you could replace your microservices with OpenWhisk actions. 

**Important**: You must complete [scenario two for Kubernetes Clusters](#2-kubernetes-clusters) in order to proceed the following steps.

First, you want to delete all the services and deployments from the previous scenario.

```bash
kubectl delete -f flightassist.yaml
```

Then, install [OpenWhisk CLI](https://console.ng.bluemix.net/openwhisk/learn/cli) and Mark down its credentials.

Next, edit `flightassist_serverless.yaml` and replace the `<namespace>` with your own namespace, `<your-app-end-point-url>` with your node ip and nodeport, and `<your-openwhisk-auth>` with your OpenWhisk authendication. You can run `wsk property get --auth | awk '{print $3}'` to view your OpenWhisk authentication.

Now, let's deploy the new flightassist app with serverless.

```bash
kubectl create -f flightassist_serverless.yaml
```

Congratulation, now your Flightassist application should be running on `http://<your_node_ip>:30080`. Also, you can learn about [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# How to Use Flightassist

First, you want to [add a trip on TripIt](https://www.tripit.com/trip/create). Then, add a new flight plan for your trip. In your plan, please fill in your confirmation number or airline with flight number.

![Tripit plan](images/plans.png)

Once you added a new plan and you have your Flightassist running, open your Flightassist and click **Authenticate with TripIt** to login to Flightassist.

Now you can see the most recent flight status and weather for all your flights within 24 hours.

![Flightassist status](images/status.png)

# Reference 

This project is based on this [flightassist](https://github.com/estesp/flightassist) example.

[Phil Estes](https://github.com/estesp) and [Lin Sun](https://github.com/linsun) are the main contributers for the [flightassist](https://github.com/estesp/flightassist) example.

# License
[Apache 2.0](LICENSE)

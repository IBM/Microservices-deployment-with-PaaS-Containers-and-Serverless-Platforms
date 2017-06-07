[![Build Status](https://travis-ci.org/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms.svg?branch=master)](https://travis-ci.org/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms)

# Navigating your Microservices deplyoment options with Cloud Foundry, Kubernetes, OpenWhisk and Istio

Microservices and containers are now influencing application design and deployment patterns, and will continue to do so for the foreseeable future. According to one survey, 60 percent of all new applications will use cloud-enabled continuous delivery microservice architectures, DevOps, and containers. But with the profileration of microservices, number of deployment platforms have emerged. What do we choose and why? In this journey we help you navigate microservices deplyoment options with some popoular microservices platforms like Cloud Foundry, Kubernetes, OpenWhisk and Istio

We use a sample Node.js application, flightassist for demonstrating and comparing various microservices deployment technologies. Specifically, a set of trade-offs and comparisons can be made between these deployment models, and this application is a proving ground for those discussions. 

![architecure-diagram](images/paas-containers.png)

#### Scenario One: Deploy Flightassist microservices on Cloud Foundry 
#### Scenario Two: Deploy Flightassist microservices on Kubernetes Clusters
#### Scenario Three: Deploy Flightassist microservices on Istio
#### Scenario Four: Deploy Flightassist microservices augmented with functions on OpenWhisk

## Included Components
The scenarios are accomplished by using:

- [Cloud Foundry](https://www.cloudfoundry.org)
- [Kubernetes Clusters](https://console.ng.bluemix.net/docs/containers/cs_ov.html#cs_ov)
- [Istio](https://istio.io)
- [OpenWhisk](https://www.ibm.com/cloud-computing/bluemix/openwhisk)
- [Cloudant NoSQL Database](https://cloudant.com)
- [Insights for Weather](https://console.ng.bluemix.net/docs/services/Weather/weather_overview.html#about_weather)
- [TripIt Developer API](https://www.tripit.com/developer)
- [FlightStats Developer API](https://developer.flightstats.com)

## Prerequisites

Register and obtain the [FlightStats Developer API](https://developer.flightstats.com/signup) and [TripIt Developer API](https://www.tripit.com/developer/create) to query flight status. 

When signing up for a FlightStats developer key, note that there is a review process that may take 24 hours or more to get your application credentials activated for a 30-day trial with the API.

## Deploy using DevOps Toolchain 

Click the button to deploy your app and fill in all the variables from **Delivery Pipeline**. For Further instructions, please follow the [Toolchain instructions](https://github.com/IBM/container-journey-template/blob/master/Toolchain_Instructions_new.md).

[![Create Toolchain](https://github.com/IBM/container-journey-template/blob/master/images/button.png)](https://console.ng.bluemix.net/devops/setup/deploy/)

### Toolchain Scenarios One: Monolithic Application
You should see a link under the Cloud Foundry Deploy stage and that's where your application is hosting. 

### Toolchain Scenarios Two: Microservices on Kubernetes Clusters, with or without Serverless capabilities

If you want to deploy with microservices, please leave the **OpenWhisk Auth** variable blank on **Delivery Pipeline**.
Otherwise, fill in the **OpenWhisk Auth** variable to enable serverless for your Flightassist.

Then, click **View logs and history** under Kubernetes Deploy stage in your pipeline to access your application via the URL link at the end of your logs.

# Steps

1. [Provision application services - Cloudant Database and Insights for Weather Service](#1-create-your-cloudant-database-and-insights-for-weather-service)
2. [Deploy monolithic application](#deploy-monolithic-flightassist-application-using-cloud-foundry)
3. [Factor monolithic application into microservices and test](#factor-monolithic-application-into-microservices-and-test)
4. Deploy microservices leveraging:
- [Cloud Foundry](#scenario-one-deploy-flightassist-microservices-on-cloud-foundry-1)
- [Kubernetes Cluster](#scenario-two-deploy-flightassist-microservices-on-kubernetes-cluster)
- [Istio](#scenario-three-deploy-flightassist-microservices-on-istio)
- [OpenWhisk](scenario-four-deploy-flightassist-leveraging-openWhisk-functions)

After you deployed Flightassist using any platform, you can go to [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# 1. Create your Cloudant Database and Insights for Weather Service

First, clone and get in our repository `git clone https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms.git && cd Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms` to obtain the necessary files and scripts for building this example.

Since we need to create services using the command line, we need to install [Bluemix CLI](http://clis.ng.bluemix.net/ui/home.html) before proceeding to the following steps.

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
# Deploy monolithic Flightassist application using Cloud Foundry

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
   - `BASE_URL`: You URL for accessing your application. e.g. {app_name}.mybluemix.net

Your application should restart automatically, but can be done manually as well
in the UI. With the service bindings and added environment variables, the
application should be operational at the hostname route you selected for your CF
application. 

Congratulation, now you can learn about [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# Factor monolithic application into microservices and test

First, install [Docker CLI](https://www.docker.com/community-edition#/download).

Next, edit the `docker-compose.yaml` file and add your credentials for **FLIGHTSTATS_APP_ID**, **FLIGHTSTATS_APP_KEY**, **TRIPIT_API_KEY**,**TRIPIT_API_SECRET**,**CLOUDANT_URL**, and **WEATHER_URL**. You can run the following command to view your service credentials.

```bash
bx service keys {service_name} #This will output all your service keys
bx service key-show {service_name} {service key} #This will output your service credential, "url" is Your service URL
```

Then, run the following commands to build your docker images and run Docker Compose. 

```bash
docker build -f main_application/Dockerfile.local -t flightassist main_application
docker build -f flightassist-weather/Dockerfile.alpine -t weather-service flightassist-weather
docker-compose up
```

Now, your FlightAssist application should be running on http://localhost:3000/

# Scenario One: Deploy Flightassist microservices on Cloud Foundry

# Scenario Two: Deploy Flightassist microservices on Kubernetes Cluster

In this scenario, we want to break down Flightassist to multiple containers. Therefore, we will run Flightassist as our main application with weather-service as our microservice to query the weather data. Then, we will host those containers using Docker Compose or Kubernetes. 

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
docker build -f main_application/Dockerfile.local -t registry.ng.bluemix.net/<namespace>/flightassist main_application
docker build -f flightassist-weather/Dockerfile.alpine -t registry.ng.bluemix.net/<namespace>/weather-service flightassist-weather
docker push registry.ng.bluemix.net/<namespace>/flightassist
docker push registry.ng.bluemix.net/<namespace>/weather-service
```

Then, you need to run the following commands to bind your Cloudant and Weather Insights services to your clusters. 

```bash
bx cs cluster-service-bind {your-cluster-name} default mycloudant
bx cs cluster-service-bind {your-cluster-name} default myweatherinsights
```

Next, create secret to give FlightStats and TripIt API credentials for Flightassist. Modify the secret.yaml file with **flightstats-app-id**, **flightstats-app-key**, **tripit-api-key**, and **tripit-api-secret**.

Then, edit the `flightassist.yaml` and replace the ```<namespace>``` with your own namespace. You can obtain your namespace by running `bx cr namespace`. Also replace `<your-app-end-point-url>` with your node ip and nodeport (e.g. 169.47.237.139:30080). You can obtain your IP by running `kubectl get nodes` and your nodeport is 30080.

Lastly, run the following commands to deploy the secret and deployment.

```bash
kubectl create -f secret.yaml
kubectl create -f flightassist.yaml
```

Congratulation, now your Flightassist application should be running on `http://<your_node_ip>:30080`. You can go to [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.


# Scenario Three: Deploy Flightassist microservices on Istio

# Scenario Four: Deploy Flightassist leveraging OpenWhisk functions

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

## Code Structure

### Cloud Foundry application

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats, tripIt, and weather information, shared by all deployment options |
| [package.json](main_application/package.json)     | List the packages required by the application |
| [manifest.yml](main_application/manifest.yml)     | Description of the application to be deployed |

### Docker Compose with microservices

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [app.py](flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [package.json](main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](main_application/Dockerfile.local) and [Dockerfile.alpine](flightassist-weather/Dockerfile.alpine) | Description of the Docker image |
| [docker-compose.yaml](docker-compose.yaml) | Specification file for the deployment of the service in Docker |


### Kubernetes deployment with microservices

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [app.py](flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [package.json](main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](main_application/Dockerfile.local) and [Dockerfile.alpine](flightassist-weather/Dockerfile.alpine) | Description of the Docker image |
| [flightassist.yaml](flightassist.yaml) and [secret.yaml](secret.yaml)| Specification file for the deployment of the service and secret in Kubernetes |

### Kubernetes deployment with serverless

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| [weather.js](main_application/weather.js)       | Trigger actions in OpenWhisk to get the weather information |
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [package.json](main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](main_application/Dockerfile.local)         | Description of the Docker image          |
| [flightassist_serverless.yaml](flightassist_serverless.yaml) and [secret.yaml](secret.yaml)| Specification file for the deployment of the service and secret in Kubernetes |

# Reference 

This project is based on this [flightassist](https://github.com/estesp/flightassist) example.

[Phil Estes](https://github.com/estesp) and [Lin Sun](https://github.com/linsun) are the main contributers for the [flightassist](https://github.com/estesp/flightassist) example.

# License
[Apache 2.0](LICENSE)

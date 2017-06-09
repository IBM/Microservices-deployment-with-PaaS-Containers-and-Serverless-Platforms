[![Build Status](https://travis-ci.org/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms.svg?branch=master)](https://travis-ci.org/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms)

# Monlothic to Cloud-Native: Navigate application deplyoment options with Cloud Foundry, Kubernetes, OpenWhisk and Istio

Microservices and containers are now influencing application design and deployment patterns and will continue to do so for the foreseeable future. According to one survey, 60 percent of all new applications will use cloud-enabled continuous delivery microservice architectures, DevOps, and containers. But with the proliferation of microservices, a number of deployment platforms have emerged. What do we choose and why? In this journey, we help you navigate microservices deployment options with some popular microservices platforms like Cloud Foundry, Kubernetes, OpenWhisk and Istio

We use a sample Node.js application, flightassist for demonstrating and comparing various microservices deployment technologies. Specifically, a set of trade-offs and comparisons can be made between these deployment models, and this application is a proving ground for those discussions. 

![architecure-diagram](images/paas-containers.png)

To demostrate the multi container situation, we'll add a python program to the picture. Instead of directly access the apis from Node app, the python program will serve as a proxy to query the two services.The following scenarios are based on that flow.

#### [Scenario One: Deploy Flightassist microservices on Cloud Foundry](#4-deploy-flightassist-microservices-on-cloud-foundry) 
#### [Scenario Two: Deploy Flightassist microservices on Kubernetes Clusters](#5-deploy-flightassist-microservices-on-kubernetes-cluster)
#### [Scenario Three: Deploy Flightassist microservices on Istio](#6-deploy-flightassist-microservices-on-istio)
#### [Scenario Four: Deploy Flightassist microservices augmented with functions on OpenWhisk](#7-deploy-flightassist-leveraging-openwhisk-functions)

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

Register and obtain the keys for [FlightStats Developer API](https://developer.flightstats.com/signup) and [TripIt Developer API](https://www.tripit.com/developer/create) to query flight status. 

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

## Part A: Deploy, test and factor Monolithic application into microservices:

1. [Provision application services - Cloudant Database and Insights for Weather Service](#1-create-your-cloudant-database-and-insights-for-weather-service)
2. [Deploy monolithic application](#2-deploy-monolithic-flightassist-application-using-cloud-foundry)
3. [Factor monolithic application into microservices and test](#3-factor-monolithic-application-into-microservices-and-test)
   3.1 [Microservices application codebases]()
   3.2 [Docker containers]()

## Part B: Deploy microservices leveraging:

4. [Cloud Foundry](#4-deploy-flightassist-microservices-on-cloud-foundry)
5. [Kubernetes Cluster](#5-deploy-flightassist-microservices-on-kubernetes-cluster)
6. [Istio](#6-deploy-flightassist-microservices-on-istio)
7. [OpenWhisk](#7-deploy-flightassist-leveraging-openwhisk-functions)

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
bx service key-create mycloudant {service key} #You can put any name for your {service key}
bx service key-show mycloudant {service key} #This will output your cloudant credential, "url" is Your cloudant URL
curl -k -X PUT {your-cloudantURL}/trips
curl -k -X PUT {your-cloudantURL}/weather
curl -k -X PUT {your-cloudantURL}/connections
```
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
   - `BASE_URL`: You URL for accessing your application. e.g. {app_name}.mybluemix.net

Your application should restart automatically but can be done manually as well
in the UI. With the service bindings and added environment variables, the
application should be operational at the hostname route you selected for your CF
application. 

Congratulation, now you can learn about [How to Use Flightassist](#how-to-use-flightassist) and start testing your application.

# 3. Factor monolithic application into microservices and test

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

# 4. Deploy Flightassist microservices on Cloud Foundry
In this scenario, we want to break down Flightassist to multiple apps. Since Cloud Foundry apps(warden containers) are not allowed to talk privately, they need to communicate via public route.

First, make sure you have cloudant and weatherinsights services are created as listed in step 1. And make sure you have both developer accounts mentioned in prerequisites.

Now we push the python application.
```
cf push <name1> -f path-to/flightassist-weather/manifest.yml
```
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
cf push <name2> -f path-to/main_application/manifest.yml --no-start
```
**make sure you pick a unique name for the app, too.**

Now we inject the environment variables as in monolithic deployment:
 - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
 - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
 - `TRIPIT_API_KEY` : API key assigned by TripIt
 - `TRIPIT_API_SECRET` : API secret assigned by TripIt
 - `BASE_URL`: You URL for accessing your application. In the format **https://**{app_name}.mybluemix.net**/**

Plus, a couple more since we have two apps:
 - `USE_WEATHER_SERVICE`: true
 - `MICROSERVICE_URL`: <i>name1</i>.mybluemix.net
 
Now we start the 2nd app:
`cf start <name2>`

You can now test the apps by going to http://<i>name2</i>.mybluemix.net

# 5. Deploy Flightassist microservices on Kubernetes Cluster

In this scenario, we want to break down Flightassist to multiple containers. Therefore, we will run Flightassist as our main application with weather-service as our microservice to query the weather data. Then, we will host those containers using Docker Compose or Kubernetes. 

First, follow the [Kubernetes Cluster Tutorial](https://github.com/IBM/container-journey-template) to create your own cluster on Bluemix.

Then, install the container registry plugin for Bluemix CLI.

```bash
bx plugin install container-registry -r Bluemix
```
Next, build your own docker images and push them to your own bluemix container registry.

> Replace `<namespace>` with your own namespace, you can view your namespace by running `bx cr namespaces`
>
> If you have an unauthorized error, run `bx cr login` to authorized your container-registry.

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


# 6. Deploy Flightassist microservices on Istio

## 6.1 Installing Istio in your Cluster
### Download the Istio source
  1. Download the latest Istio release for your OS: [Istio releases](https://github.com/istio/istio/releases)  
  2. Extract and go to the root directory.
  3. Copy the `istioctl` bin to your local bin  
  ```bash
  $ cp bin/istioctl /usr/local/bin
  ## example for macOS
  ```

### Grant Permissions  
  1. Run the following command to check if your cluster has RBAC  
  ```bash
  $ kubectl api-versions | grep rbac
  ```  
  2. Grant permissions based on the version of your RBAC  
    * If you have an **alpha** version, run:

      ```bash
      $ kubectl apply -f install/kubernetes/istio-rbac-alpha.yaml
      ```

    * If you have a **beta** version, run:

      ```bash
      $ kubectl apply -f install/kubernetes/istio-rbac-beta.yaml
      ```

    * If **your cluster has no RBAC** enabled, proceed to installing the **Control Plane**.

### Install the [Istio Control Plane](https://istio.io/docs/concepts/what-is-istio/overview.html#architecture) in your cluster  
```bash
kubectl apply -f install/kubernetes/istio.yaml
cd ..
```
You should now have the Istio Control Plane running in Pods of your Cluster.
```bash
$ kubectl get pods
NAME                              READY     STATUS    RESTARTS
istio-egress-3850639395-30d1v     1/1       Running   0       
istio-ingress-4068702052-2st6r    1/1       Running   0       
istio-manager-251184572-x9dd4     2/2       Running   0       
istio-mixer-2499357295-kn4vq      1/1       Running   0       
```

## 6.2. Inject Istio Envoys on Flightassist.

**Important**: You must complete [scenario two for Kubernetes Clusters](#2-kubernetes-clusters) in order to proceed the following steps.

First, you want to delete all the services and deployments from the previous scenario.

```bash
kubectl delete -f flightassist.yaml
```

Now, grab your isito-ingress IP:Port.

```bash
echo $(kubectl get po -l istio=ingress -o jsonpath={.items[0].status.hostIP}):$(kubectl get svc istio-ingress -o jsonpath={.spec.ports[0].nodePort})
```

Then, edit the `flightassist.yaml` file and replace your **BASE_URL** with `http://<isito-ingress IP:Port>`
> You also can remove `type:NodePort` on *flightassist-service* because we will access our application via isito-ingress.

Next, deploy ingress to connect the microservices and inject Istio envoys on Flightassist and Weather Microservice. 

```bash
kubectl create -f ingress.yaml
kubectl create -f <(istioctl kube-inject -f flightassist.yaml --includeIPRanges=172.30.0.0/16,172.20.0.0/16)
```

Congratulation, now your Flightassist application should be running on `http://<isito-ingress IP:Port>`.

# 7. Deploy Flightassist leveraging OpenWhisk functions

In this scenario, we will deploy Flightassist with serverless to show how you could replace your microservices with OpenWhisk actions. 

**Important**: You must complete [scenario two for Kubernetes Clusters](#2-kubernetes-clusters) in order to proceed the following steps.

First, you want to delete all the services and deployments from the previous scenario.

```bash
kubectl delete -f flightassist.yaml
```

Then, install [OpenWhisk CLI](https://console.ng.bluemix.net/openwhisk/learn/cli) and Mark down its credentials.

Next, edit `flightassist_serverless.yaml` and replace the `<namespace>` with your own namespace, `<your-app-end-point-url>` with your node ip and nodeport, and `<your-openwhisk-auth>` with your OpenWhisk authentication. You can run `wsk property get --auth | awk '{print $3}'` to view your OpenWhisk authentication.

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

# Comparisons

It's hard to compare the different technologies toe to toe since they are targeted for different use cases. However,we can get a sense of their pros and cons from the above example.

Cloud Foundry: Developer Centric; Developers don't have to build or maintain containers; Support various programming languages and libraries; Large bases of services; Kind of hacky to deploy multi apps; Needs to know CF functions well to manage.    
Kubernetes: Orchestration tool that manages complicated container delolyments well; Large services available ;Developer has to build and maintain containers in the repositories.   

Istio: Addtion to Kubernetes; Provide load balancing and other features; Needs to know the "envoy" concept.   

OpenWhisk: Servless, event triggering; low cost; Single function based, doesn't work for large apps; Stateless.



# Reference 

This project is based on this [flightassist](https://github.com/estesp/flightassist) example.

[Phil Estes](https://github.com/estesp) and [Lin Sun](https://github.com/linsun) are the main contributors for the [flightassist](https://github.com/estesp/flightassist) example.

# License
[Apache 2.0](LICENSE)

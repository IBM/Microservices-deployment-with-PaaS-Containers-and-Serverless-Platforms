# Deploy Flightassist leveraging OpenWhisk functions

In this scenario, we will deploy Flightassist with a function that can query all the necessary Weather data. This shows how you could replace your microservices with OpenWhisk actions. Therefore, you can move all your low cost microservices on OpenWhisk to save space and runtime on your server.

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

Now, run the following commands to deploy the secret

```bash
kubectl create -f secret.yaml
```

> Note : you need to delete all the services and deployments from the previous scenario.
>
> ```bash
> kubectl delete -f flightassist.yaml
> ```

Then, install [OpenWhisk CLI](https://console.ng.bluemix.net/openwhisk/learn/cli) and Mark down its credentials.

Next, edit `flightassist_serverless.yaml` and replace the `<namespace>` with your own namespace, `<your-app-end-point-url>` with your node ip and nodeport, and `<your-openwhisk-auth>` with your OpenWhisk authentication. You can run `wsk property get --auth | awk '{print $3}'` to view your OpenWhisk authentication.

Now, let's deploy the new flightassist app with serverless capability

```bash
kubectl create -f flightassist_serverless.yaml
```

Congratulation, now your Flightassist application should be running on `http://<your_node_ip>:30080`. Also, you can learn about [How to Use Flightassist](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms#how-to-use-flightassist) and start testing your application.

## Takeaway points
In this example, the flightassist app is a perfect use case to use openwhisk: 
1. It is an event triggered app, the triggering point is when it is accessed
2. It is a stateless app, there are no sessions to manage
3. It doesn't require persistence
4. It performs a simple function

Many complicated apps are not so easy to be converted into serverless functions.

# Code Structure

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| [weather.js](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/weather.js)       | Trigger actions in OpenWhisk to get the weather information |
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [package.json](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/main_application/Dockerfile.local)         | Description of the Docker image          |
| [flightassist_serverless.yaml](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/flightassist_serverless.yaml) and [secret.yaml](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms/blob/master/secret.yaml)| Specification file for the deployment of the service and secret in Kubernetes |
# Deploy Flightassist microservices on Kubernetes Cluster

In this scenario, we use the Flightassist microservices version which runs in two containers. We will run Flightassist as our main application with weather-service as our microservice to query the weather data. Then, we will host those containers using Kubernetes.

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

> Note : If you deployed any servers or deployment from other scenarios, you need to delete them before you proceed to the following steps.
>
> ```bash
> kubectl delete -f flightassist.yaml
> ```

Lastly, run the following commands to deploy the secret and deployment.

```bash
kubectl create -f secret.yaml
kubectl create -f flightassist.yaml
```

Congratulations, now your Flightassist application should be running on `http://<your_node_ip>:30080`. You can go to [How to Use Flightassist](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms#how-to-use-flightassist) and start testing your application.

## Takeaway points
Kubernetes is a powerful container orchestration tool. In this example we get a taste of the logical concept of clusters, creating a deployment and service binding. It also has the container networking features built in. As a developer, you need to handle building container images and managing images in repositories. This gives user full control over the underlying OS, lends itself to resuse and portability across multiple container orchestration platforms. Service registration and loadbalancing features also lend itself to a microservices deployment. Though for a typical developer, the experience is infrastructure centric, requires knowledge about Kubernetes fundamentals, and the simplicity of deploying applications and binding services at a PaaS level are lost.


# Code Structure

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](../main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [app.py](../flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [package.json](../main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](../main_application/Dockerfile.local) and [Dockerfile.alpine](../flightassist-weather/Dockerfile.alpine) | Description of the Docker image |
| [flightassist.yaml](../flightassist.yaml) and [secret.yaml](../secret.yaml)| Specification file for the deployment of the service and secret in Kubernetes |

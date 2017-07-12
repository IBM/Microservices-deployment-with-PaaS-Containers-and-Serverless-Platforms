# Enable Flightassist microservices with Istio service-mesh capabilities

Istio is an open platform that provides a uniform way to connect, manage, and secure microservices. Istio is the result of a joint collaboration between IBM, Google and Lyft as a means to support traffic flow management, access policy enforcement and the telemetry data aggregation between microservices, all without requiring changes to the code

## 1. Setup your Kubernetes environment and images.

First, follow the [Kubernetes Cluster Tutorial](https://github.com/IBM/container-journey-template) to create your own cluster on Bluemix.

Then, install the container registry plugin for Bluemix CLI.

```bash
bx plugin install container-registry -r Bluemix
```
Next, build your own docker images and push them to your own bluemix container registry.
> You may skip these steps through deploying the secrets if you performed the Flightassist microservices deployment on Kubernetes scenario

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

## 2. Installing Istio in your Cluster

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

## 3. Inject Istio Envoys on Flightassist.

> Note : if you performed the Flightassist microservices deployment on Kubernetes scenario you need to delete the previous services and deployments.
>
> ```bash
> kubectl delete -f flightassist.yaml
> ```

First, grab your isito-ingress IP:Port.

```bash
echo $(kubectl get po -l istio=ingress -o jsonpath={.items[0].status.hostIP}):$(kubectl get svc istio-ingress -o jsonpath={.spec.ports[0].nodePort})
```

Then, edit the `flightassist.yaml` and replace the ```<namespace>``` with your own namespace. You can obtain your namespace by running `bx cr namespace`. Also replace `<your-app-end-point-url>` with `http://<isito-ingress IP:Port>`
> You also can remove `type:NodePort` on *flightassist-service* because we will access our application via isito-ingress.

Next, deploy ingress to connect the microservices and inject Istio envoys on Flightassist and Weather Microservice.

```bash
kubectl create -f ingress.yaml
kubectl create -f <(istioctl kube-inject -f flightassist.yaml --includeIPRanges=172.30.0.0/16,172.20.0.0/16)
```

Congratulations, now your Flightassist application should be running on `http://<isito-ingress IP:Port>`. You can go to [How to Use Flightassist](https://github.com/IBM/Microservices-deployment-with-PaaS-Containers-and-Serverless-Platforms#how-to-use-flightassist) and start testing your application.


## 4. Exporing additional features on Istio.

One feature provided by Istio is rate limits. Rate limits can limit the number of accesses from users and prevent your website from getting abused.

To enable this, run

```bash
istioctl mixer rule create global flightassist-service.default.svc.cluster.local -f ratelimit.yaml
```

Now, your rate limit is 50 requests per 10 seconds. Since the flightassist website will use 15-20 requests per visit, you should see your Mixer returns a `RESOURCE_EXHAUSTED` after you refresh your site 3 to 4 times.

You can learn about other additional features on Istio by clicking [here](https://istio.io/docs/tasks/index.html).

## Takeaway points

Istio is a service-mesh for microservices deployment and managing your application traffic. Istio provides an easy way to create this service mesh by deploying a control plane and injecting sidecars, an extended version of the Envoy proxy, in the same Pod as your microservice. In addition to the proxy feature we tested in the example, it also provides rich layer-7 routing, circuit breakers, policy enforcement and telemetry recording/reporting functions. This gives end users much better control over canary deployments, and not worrying about issues like service discovery etc. In addition, there is a focus from monitoring and trace collection from an application and microservices perspective, which a native container orchestration experience would not provide. However, Istio on its own is not sufficient, and it has to reside on a platform. 


# Code Structure

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| [flightassist.js](../main_application/flightassist.js)       | Main application, start the express web server and calling the major AJAX functions|
| All JavaScript files (main_application/*.js)         | The implementation of the flightstats and tripIt information, shared by all deployment options |
| [app.py](../flightassist-weather/scr/app.py) | Weather Microservice, query and sent weather information to the main application |
| [package.json](../main_application/package.json)         | List the packages required by the application |
| [Dockerfile.local](../main_application/Dockerfile.local) and [Dockerfile.alpine](../flightassist-weather/Dockerfile.alpine) | Description of the Docker image |
| [flightassist.yaml](../flightassist.yaml) and [secret.yaml](../secret.yaml)| Specification file for the deployment of the service and secret in Kubernetes |
| [ingress.yaml](../ingress.yaml)| Specification file for adding flightassist's endpoint to istio-ingress|
| [ratelimit.yaml](../ratelimit.yaml) | Specification file for creating rate limits with Istio Mixer|

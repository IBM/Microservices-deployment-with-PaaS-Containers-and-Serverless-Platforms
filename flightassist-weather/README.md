# flightassist-weather
Weather micro-service for the flightassist demo application, written in
python.  This micro-service interacts with the [Weather Company weather
data](https://console.ng.bluemix.net/catalog/services/weather-company-data/)
service to obtain the weather data for a given location.  The microservice can
run locally as Docker container or in a container service, for example, use `make localdeploy` to deploy the microservice locally.   Once it is deployed, you may interact with the weather service using curl:

curl -X GET 'http://localhost:80/weather/41.788136/-87.740871'

When running the microservice in a container service such as swarm or
kubernetes, you will replace localhost with the service name (e.g.
weather-service) to lookup the service.

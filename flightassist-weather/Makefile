# Simple Makefile to perform simple build/deploy steps for
# the Flightassist demo application code

.PHONY: localimage localdeploy

localimage: Dockerfile.alpine
	docker build -f Dockerfile.alpine -t weather-service:v1 .

localdeploy: localimage
	source .env && docker rm -f /weather-service && docker run --name weather-service -p 80:5000 \
	-e WEATHER_URL=$WEATHER_URL weather-service:v1

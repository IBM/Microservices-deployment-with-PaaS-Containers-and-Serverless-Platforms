# Simple Makefile to perform simple build/deploy steps for
# the Flightassist demo application code

.PHONY: localdeploy localctr cfdeploy bxdeploy localimage bximage swarmdeploy clean npm npmupdate swarmdeploy swarmsecrets swarmstop

BMIX_REGISTRY=registry.ng.bluemix.net
BMIX_NAMESPACE=$(shell cf ic namespace get)

# clean only removes locally generated node modules
clean:
	rm -fR node_modules

localdeploy: node_modules npmupdate
	source .env && node ./flightassist.js

npm: package.json
	npm install

node_modules: npm

npmupdate: package.json
	npm update

cfdeploy: manifest.yml
	cf push

localimage: Dockerfile.local
	docker build -f Dockerfile.local -t flightassist:local .

bximage: Dockerfile.bmix
	docker build -f Dockerfile.bmix -t flightassist:bluemix .
	docker tag flightassist:bluemix $(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest
	docker push $(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest

localctr: localimage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) -e USE_WEATHER_SERVICE=$(USE_WEATHER_SERVICE) \
		flightassist:local

bxdeploy: bximage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) -e USE_WEATHER_SERVICE=$(USE_WEATHER_SERVICE) \
		$(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest

# note that the compose yaml also expects the weather service image to be available as well
# which is hosted in a separate project: github.com/estesp/flightassist-weather
swarmdeploy: localimage swarmsecrets
	docker stack deploy -c docker-compose.yaml flightassist

swarmsecrets: create-swarm-secrets.sh
	./create-swarm-secrets.sh

swarmstop:
	docker service ls | awk ' { print $2 } ' | grep -v "NAME" | grep "flightassist" | xargs -n 1 docker service rm


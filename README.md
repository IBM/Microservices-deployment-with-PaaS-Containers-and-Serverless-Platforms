# Containers vs PAAS vs Serverless

This project is in progress. However, you can visit [README_old.md](README_old.md) for instructions from the original version.

## Scenarios
- Scenario One: Deploy Flightassist as containers using Kubernetes Clusters.
- Scenario Two: Deploy Flightassist on Cloud Platform using Cloud Foundry .
- Scenario Three: Deploy Flightassist with Serverless using OpenWhisk.

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

For this example, we will use Bluemix's [The Cloudant NoSQL database service](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db?env_id=ibm:yp:us-south) and [Insights for Weather service](https://console.ng.bluemix.net/catalog/services/weather-company-data?env_id=ibm:yp:us-south) for our database and weather data. Therefore, we want to create each of these services and mark down their service credentials. 

Before moving on, the demo application is missing code to create the databases used
to cache API responses in your newly created Cloudant instance. One simple way
to make sure these databases are initialized is through the Bluemix console UI.
Go to your new Cloudant service and open the Cloudant UI console using the link from your
service instance page. Once at the Cloudant console you will need to
create the **trips**, **weather**, and **connections** databases for
the cacheing code to work properly.

Then, we also need [TripIt Developer API](https://www.tripit.com/developer/create) and [FlightStats Developer API](https://developer.flightstats.com/signup) for our flight status. 

When signing up for a FlightStats developer key, note that there is a
review process that may take 24 hours or more to get your application
credentials activated for a 30-day trial with the API.

Futhermore, we need to install [OpenWhisk CLI](https://console.ng.bluemix.net/openwhisk/learn/cli) to deploy it with serverless and Mark down its credentials.

Now copy `dot-env` to `.env` and edit `.env` to fill in all required credentials from your five services. (i.e. FLIGHTSTATS_APP_ID, FLIGHTSTATS_APP_KEY, TRIPIT_API_KEY, TRIPIT_API_SECRET, CLOUDANT_URL, WEATHER_URL, and OPENWHISK_AUTH)

Lastly, install [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) and Setup [Kubernetes Cluster](https://console.ng.bluemix.net/docs/containers/cs_tutorials.html#cs_tutorials) for PAAS and Containers deployments.

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
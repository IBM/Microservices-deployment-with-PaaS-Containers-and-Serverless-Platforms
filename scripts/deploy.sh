#!/bin/bash

echo "Create FlightAssist"
IP_ADDR=$(bx cs workers $CLUSTER_NAME | grep Ready | awk '{ print $2 }')
if [ -z $IP_ADDR ]; then
  echo "$CLUSTER_NAME not created or workers not ready"
  exit 1
fi

echo -e "Configuring vars"
exp=$(bx cs cluster-config $CLUSTER_NAME | grep export)
if [ $? -ne 0 ]; then
  echo "Cluster $CLUSTER_NAME not created or not ready."
  exit 1
fi
eval "$exp"

echo -e "Deleting previous version of FlightAssist if it exists"
kubectl delete --ignore-not-found=true svc,deployment flightassist-service
kubectl delete --ignore-not-found=true svc,deployment weather-service

bx cs cluster-service-bind $CLUSTER_NAME default mycloudant
bx cs cluster-service-bind $CLUSTER_NAME default myweatherinsights

sed -i s#<insert app ID>#$FLIGHTSTATS_APP_ID# secret.yaml
sed -i s#<insert app key>#$FLIGHTSTATS_APP_KEY# secret.yaml
sed -i s#<insert API key>#$TRIPIT_API_KEY# secret.yaml
sed -i s#<insert API secret>#$TRIPIT_API_SECRET# secret.yaml

sed -i s#<your-app-end-point-url>#$IP_ADDR:30080# flightassist.yaml
sed -i s#registry.ng.bluemix.net/<namespace>/flightassist#docker.io/tomcli/flightassist# flightassist.yaml
sed -i s#registry.ng.bluemix.net/<namespace>/weather-service#docker.io/tomcli/weather-service# flightassist.yaml

kubectl create -f secret.yaml
kubectl create -f flightassist.yaml

echo "" && echo "View your FlightAssist website at http://$IP_ADDR:30080"

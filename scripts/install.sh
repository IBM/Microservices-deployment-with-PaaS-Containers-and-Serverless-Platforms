#!/bin/sh

function install_bluemix_cli() {
  #statements
  echo "Installing Bluemix cli"
  curl -L "https://cli.run.pivotal.io/stable?release=linux64-binary&source=github" | tar -zx
  sudo mv cf /usr/local/bin
  sudo curl -o /usr/share/bash-completion/completions/cf https://raw.githubusercontent.com/cloudfoundry/cli/master/ci/installers/completion/cf
  cf --version
  curl -L public.dhe.ibm.com/cloud/bluemix/cli/bluemix-cli/Bluemix_CLI_0.5.1_amd64.tar.gz > Bluemix_CLI.tar.gz
  tar -xvf Bluemix_CLI.tar.gz
  sudo ./Bluemix_CLI/install_bluemix_cli
}

function bluemix_auth() {
  echo "Authenticating with Bluemix"
  echo "1" | bx login -a https://api.ng.bluemix.net -u $BLUEMIX_USER -p $BLUEMIX_PASS
  echo "1" | cf login -a https://api.ng.bluemix.net -u $BLUEMIX_USER -p $BLUEMIX_PASS
  curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
  bx plugin install container-service -r Bluemix
  echo "Installing kubectl"
  chmod +x ./kubectl
  sudo mv ./kubectl /usr/local/bin/kubectl
}

function cluster_setup() {
  #change cluster-travis to cluster name
  bx cs workers $CLUSTER
  $(bx cs cluster-config $CLUSTER | grep export)

  echo "Deleting openwhisk namespace if it exists..."
  kubectl delete --ignore-not-found=true svc,deployment flightassist-service
  kubectl delete --ignore-not-found=true svc,deployment weather-service
  kubectl delete --ignore-not-found=true -f secret.yaml
}

function application_setup() {
  #creating services

  # Trial accounts that are expired cannot use any Bluemix service other than kubernetes cluster.
  # bx service create cloudantNoSQLDB Lite mycloudant
  # bx service create weatherinsights Free-v2 myweatherinsights
  
  # bx cs cluster-service-bind $CLUSTER_NAME default mycloudant
  # bx cs cluster-service-bind $CLUSTER_NAME default myweatherinsights

  #set dummy cred
  sed -i s#"<insert-app-ID>"#"1234567"# secret.yaml
  sed -i s#"<insert-app-key>"#"1234567"# secret.yaml
  sed -i s#"<insert-API-key>"#"1234567"# secret.yaml
  sed -i s#"<insert-API-secret>"#"1234567"# secret.yaml
  kubectl create -f secret.yaml

  echo "Create FlightAssist"
  IP_ADDR=$(bx cs workers $CLUSTER | grep Ready | awk '{ print $2 }')

  sed -i s#"<your-app-end-point-url>"#$IP_ADDR:30080# flightassist.yaml
  sed -i s#"registry.ng.bluemix.net/<namespace>/flightassist"#docker.io/tomcli/flightassist# flightassist.yaml
  sed -i s#"registry.ng.bluemix.net/<namespace>/weather-service"#docker.io/tomcli/weather-service# flightassist.yaml
  kubectl create -f flightassist.yaml

}



install_bluemix_cli
bluemix_auth
cluster_setup
application_setup

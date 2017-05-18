#!/bin/bash

if [ ! -f .env ]; then
	echo "Your .env file has not been created yet. Please follow the instructions to create it."
	exit 1
else
	source .env
fi

function remove_secret {
  local secret="$1"

  { error=$(docker secret rm ${secret} 2>&1 1>/dev/null); }
  if [ -n "${error}" ]; then
	  if test "${error}" != "${error%*in use by*}" ; then
		  echo "Secret ${secret} is still in use by active services; can't remove!"
		  return
      fi
	  # ignoring other errors (like doesn't exist)
  else
	  echo Successfully removed secret ${secret}
  fi
}

# remove existing secrets
remove_secret flightstats_app_id
remove_secret flightstats_app_key
remove_secret tripit_api_key
remove_secret tripit_api_secret
remove_secret cloudant_url
remove_secret weather_url
if [ "${CONVERSATION_MODE}" == "true" ]; then
	remove_secret watson_username
	remove_secret watson_password
	remove_secret conv_workspace_id
fi

# since we have sourced our ".env" file, we can just echo the values
# and pipe to the secret create command via STDIN
echo "${FLIGHTSTATS_APP_ID}" | docker secret create flightstats_app_id -
echo "${FLIGHTSTATS_APP_KEY}" | docker secret create flightstats_app_key -
echo "${TRIPIT_API_KEY}" | docker secret create tripit_api_key -
echo "${TRIPIT_API_SECRET}" | docker secret create tripit_api_secret -
echo "${CLOUDANT_URL}" | docker secret create cloudant_url -
echo "${WEATHER_URL}" | docker secret create weather_url -
if [ "${CONVERSATION_MODE}" == "true" ]; then
	echo "${WATSON_USERNAME}" | docker secret create watson_username -
	echo "${WATSON_PASSWORD}" | docker secret create watson_password -
	echo "${CONV_WORKSPACE_ID}" | docker secret create conv_workspace_id -
fi

import os, json, requests
from flask import Flask, Response, abort, request
from datetime import datetime
import logging
from logging import StreamHandler
#import urllib3

#urllib3.disable_warnings()
# Define the base logger
logging.getLogger("weather-service").setLevel(logging.DEBUG)
log = logging.getLogger("weather-service")
stream_handler = StreamHandler()
stream_formatter = logging.Formatter('[%(asctime)s] [%(thread)d] [%(module)s : %(lineno)d] [%(levelname)s] %(message)s')
stream_handler.setFormatter(stream_formatter)
log.addHandler(stream_handler)

# Flask config
app = Flask(__name__, static_url_path='')
app.config['PROPAGATE_EXCEPTIONS'] = True

# other global variables
deploy_mode = os.environ['DEPLOY']
WEATHER_EP = ''

'''
 This is the analyzer API that accepts GET data as describes below:
 GET /weather/<lat>/<lon>
'''
@app.route('/weather/<lat>/<lon>', methods=['GET'])
def get_weather(lat, lon):

    weather_service_ep = WEATHER_EP + '/api/weather/v1/geocode/' + lat + '/' + lon + '/forecast/daily/3day.json'
    log.info(weather_service_ep)
    r = requests.get(weather_service_ep, headers={'Content-type': 'application/json'})
    if r.status_code != 200:
        log.error("FAILED retrieve weather information msg: '%s', code: '%s'", r.json(), r.status_code)
        return None, r.status_code

    log.info("response json: '%s'", r.json())
    return json.dumps(r.json()), r.status_code


if __name__ == '__main__':
    # construct weather_ep from env var or vcap_services
    PORT = os.getenv('VCAP_APP_PORT', '5000')
    log.info("deploy mode is: '%s'", deploy_mode)

    if deploy_mode == 'swarm':
        with open('/run/secrets/weather_url', 'r') as url_secret:
                WEATHER_EP=url_secret.read().replace('\n', '')
    elif deploy_mode == 'kubernetes':
        with open('/run/secrets/service-bind/binding', 'r') as url_secret:
                data = json.loads(url_secret.read())
                WEATHER_EP=data['url']
    elif deploy_mode == 'cloudfoundry':  
        data = json.loads(os.environ['VCAP_SERVICES'])
        WEATHER_EP = data['weatherinsights'][0]['credentials']['url']
    else:
        WEATHER_EP = os.environ['WEATHER_URL']

    log.info("Starting flightassist weather-service")
    app.run(host='0.0.0.0', port=int(PORT))

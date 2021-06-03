#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "${SOURCE}" ]]; do # resolve ${SOURCE} until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"
    SOURCE="$(readlink "${SOURCE}")"
    [[ ${SOURCE} != /* ]] && SOURCE="${DIR}/${SOURCE}" # if ${SOURCE} was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CURRENT_DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"


function teardown() {
    kill $(ps aux | grep cli.js | grep -v grep | awk '{ print $2 }')
    kill $(ps aux | grep "zat server" | grep -v grep | awk '{ print $2 }')
}

mkdir -p ${CURRENT_DIR}/zendesk-app/assets/
mkdir -p ${CURRENT_DIR}/zendesk-app/translations

cd src/

echo "Setting parcel watch"
./node_modules/parcel/bin/cli.js watch ./assets/js/glizi.js --out-file main.js --out-dir ${CURRENT_DIR}/zendesk-app/assets/ &

trap teardown SIGINT

echo "Copying stuff that's needed"
cp ${CURRENT_DIR}/src/assets/*.html ${CURRENT_DIR}/zendesk-app/assets/
cp ${CURRENT_DIR}/src/assets/*.png ${CURRENT_DIR}/zendesk-app/assets/
cp ${CURRENT_DIR}/src/assets/*.css ${CURRENT_DIR}/zendesk-app/assets/
cp ${CURRENT_DIR}/src/translations/* ${CURRENT_DIR}/zendesk-app/translations/
cp ${CURRENT_DIR}/src/.zat ${CURRENT_DIR}/zendesk-app/ || echo "No .zat file found."
cp ${CURRENT_DIR}/src/*.json ${CURRENT_DIR}/zendesk-app/
cp ${CURRENT_DIR}/src/*.yml ${CURRENT_DIR}/zendesk-app/


cd ${CURRENT_DIR}/zendesk-app

echo "Starting zat server"
zat server &

echo "Observing the HTML files"
inotifywait --format %e -q -e modify,create,delete,move -m ${CURRENT_DIR}/src/assets/*.html |
while read events; do
    cp ${CURRENT_DIR}/src/assets/*.html ${CURRENT_DIR}/zendesk-app/assets/
done

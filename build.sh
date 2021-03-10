#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "${SOURCE}" ]]; do # resolve ${SOURCE} until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"
    SOURCE="$(readlink "${SOURCE}")"
    [[ ${SOURCE} != /* ]] && SOURCE="${DIR}/${SOURCE}" # if ${SOURCE} was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CURRENT_DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"

cd $CURRENT_DIR

rm -rf ./dist
rm -rf ./build
mkdir ./build
cp -r ./zendesk-app/assets ./build
cp -r ./zendesk-app/translations ./build
cp -r ./zendesk-app/manifest.json ./build
cp -r ./README.md ./build
rm -rf ./build/assets/*.js
./zendesk-app/node_modules/parcel/bin/cli.js build ./zendesk-app/assets/js/glizi.js --out-file main.js --out-dir ./build/assets
rm -rf ./build/assets/js

cd ./build
zat package
mv tmp ../dist

cd $CURRENT_DIR
rm -rf ./build
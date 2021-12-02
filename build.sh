#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "${SOURCE}" ]]; do # resolve ${SOURCE} until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"
    SOURCE="$(readlink "${SOURCE}")"
    [[ ${SOURCE} != /* ]] && SOURCE="${DIR}/${SOURCE}" # if ${SOURCE} was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CURRENT_DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"

ARG="$1"
if [[ "${ARG}" == "--dev" ]];then
  IS_DEV_MODE="TRUE"
fi

cd $CURRENT_DIR

rm -rf ./build
mkdir ./build

cp -r ./static/* ./build/
cp ./README.md ./build/

if [[ "${IS_DEV_MODE}" == "TRUE" ]]; then
    ./node_modules/webpack/bin/webpack.js --mode development
else
    rm -rf ./dist
    npm install
    echo "Bundling..."
    ./node_modules/webpack/bin/webpack.js --mode production
    cd ./build
    echo "Packaging..."
    zat package
    mv tmp ../dist
    mv ../dist/app*.zip ../dist/glizi.zip
fi


cd $CURRENT_DIR
# rm -rf ./build
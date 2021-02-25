#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "${SOURCE}" ]]; do # resolve ${SOURCE} until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"
    SOURCE="$(readlink "${SOURCE}")"
    [[ ${SOURCE} != /* ]] && SOURCE="${DIR}/${SOURCE}" # if ${SOURCE} was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CURRENT_DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"

cd $CURRENT_DIR

rm -rf ./build
mkdir ./build
cp -r ./assets ./build
cp -r ./translations ./build
cp -r ./manifest.json ./build
cp -r ./README.md ./build

cd ./build
zat package
mv tmp ../dist

cd $CURRENT_DIR
rm -rf ./build
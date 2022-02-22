#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "${SOURCE}" ]]; do # resolve ${SOURCE} until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"
    SOURCE="$(readlink "${SOURCE}")"
    [[ ${SOURCE} != /* ]] && SOURCE="${DIR}/${SOURCE}" # if ${SOURCE} was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CURRENT_DIR="$( cd -P "$( dirname "${SOURCE}" )" && pwd )"

./build.sh --dev

cd ${CURRENT_DIR}/build

which rvm > /dev/null 2>&1
if [[ $? -ne 0 ]]; then
    echo "ERROR: rvm is not installed."
    echo "Please install it with:"
    echo "  curl -sSL https://get.rvm.io | bash -s stable"
    exit 1
fi

RUBY_VERSION="2.7.5"
echo "Using Ruby ${RUBY_VERSION}"
rvm use ${RUBY_VERSION}
if [[ $? -ne 0 ]]; then
    echo "ERROR: Ruby ${RUBY_VERSION} is not installed."
    echo "       Please install it with:"
    echo "         rvm install ${RUBY_VERSION}"
    exit 1
fi

echo "Starting zat server"
zat server 
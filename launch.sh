#!/bin/sh
set -x

basedir=$(dirname $0);
basedir=$(readlink -f $basedir)
envfile=$basedir/.launchenv;
if [ -f $envfile ]; then
  . $envfile;
fi

addonsdkpath=${addonsdkpath:-$basedir/../addon-sdk}
cd $addonsdkpath
. bin/activate;

cd $basedir

if [ -z $launchaddons ] && [ -d ../tracing-console ]; then
  launchaddons=${tracingconsoledir:-../tracing-console};
fi

cfx run -o --addons=$launchaddons

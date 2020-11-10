function finish {
    cp -r ~/.tezbridge/logs .
    cp ~/.pm2/pm2.log .
}
trap finish ERR
trap finish EXIT
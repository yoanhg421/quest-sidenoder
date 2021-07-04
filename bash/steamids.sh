echo 'module.exports = {' > ../steamids.js

while IFS=';' read -r name release apk package version
do
  echo "name: $name, package: $package"
  link=$(curl  -G --silent --data-urlencode "vrsupport=401,402" --data-urlencode "term=$name" -L "https://store.steampowered.com/search/" | sed -En '/search_capsule"><img/s/.*src="([^"]*)".*/\1/p' | head -n 1)

  link=${link%%\?*}

  echo "$link"

  if [[ "$link" != "" ]] && [[ "$link" == *"jpg" ]];then
    ID=${link%%/capsule_*}
    ID=${ID##*apps/}
    echo "ID FOUND: $ID"

    if [[ "$ID" != "http"* ]] && [[ "$ID" != "242760" ]];then
      echo "  \"$package\": \"$ID\"," >> ../steamids.js
    fi
  fi
done < '/tmp/mnt/Quest Games/GameList.txt'

echo '};' >> ../steamids.js

paplay /usr/share/sounds/Oxygen-Im-Sms.ogg
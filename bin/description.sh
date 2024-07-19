#!/bin/bash -e

year=2024
base="/mnt/hddts0-plain0/tv/mp4/$year"

pushd "$base"
  find . -type d -print0 | 
  while IFS= read -r -d '' d; do
    dir="$(basename "$d")"
    echo "# TVアニメ（$year）" > "$dir/description.txt"
    curl -s 'localhost/api/recorded?isHalfWidth=true&isReverse=true&keyword='$(echo "$dir" | jq -Rr @uri) | jq -r '.records[] | "## "+.name, "", .description, "", .extended, "", "", ""'  >> "$dir/description.txt"
  done
popd

#!/bin/bash
# 由分片重建 js/app.js。分片按文件名顺序拼接，等价于原单文件（共享同一个 setup 闭包）。
# 改代码请改 parts/ 下的分片，然后执行： bash js/app/build.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cat "$DIR"/parts/*.js > "$DIR/../app.js"
echo "已重建 js/app.js：$(wc -l < "$DIR/../app.js" | tr -d " ") 行 / $(wc -c < "$DIR/../app.js" | tr -d " ") 字节"

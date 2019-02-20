find . -type f -mindepth 2 -maxdepth 2 -name index.ts |
    sed "/node_modules/d" |
    sed "/.git/d" |
    xargs -n1 -I{} dirname {} |
    while read -r loc; do
        echo "📝 $loc";
        find "$loc" -type f -iname "*.ts" -depth 1 |
            sed -e "/index/d" |
            sed -e "/.test./d" |
            sed -E "s@$loc/(.*)\.ts@export * from './\1';@" > "$loc/index.ts"
        find "$loc" -type f -name "index.ts" -depth 2 |
            xargs -n1 -I{} dirname {} |
            sed -E "s@$loc/(.*)@export * from './\1';@" >> "$loc/index.ts"
    done
find . -type f -mindepth 2 -maxdepth 2 -name index.ts |
    sed "/node_modules/d" |
    sed "/.git/d" |
    xargs -n1 -I{} dirname {} |
    while read -r loc; do
        echo "❌ $loc";
        find "$loc" -type f -iname "*.js" -delete
    done
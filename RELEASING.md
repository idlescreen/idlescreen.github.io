# Releasing

This repo follows the org's content-repo convention (see
`.github/RELEASING.md`): calendar versioning, `vYYYY.M.N`.

- `VERSION` holds the current version; `N` is the Nth release of the month.
- Push deploys the site via GitHub Pages; a `v*` tag + GitHub release
  snapshots the deployed state.
- `install.sh` is served from this repo — tag before announcing changes.

```sh
echo "YYYY.M.N" > VERSION
git add VERSION && git commit -m "release: vYYYY.M.N"
git push && git tag "v$(cat VERSION)" && git push origin "v$(cat VERSION)"
gh release create "v$(cat VERSION)" --title "v$(cat VERSION)" --notes "..."
```

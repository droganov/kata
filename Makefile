ICON_BG := \#0d4c73

.PHONY: i d build serve icons preview types lint lint-css lint-html lint-fmt lint-dead fmt test cov data c check

i:
	rm -rf node_modules package-lock.json && npm i

d:
	npm run dev

build:
	npm run build

serve: build
	deno run -A .deno-deploy/server.ts

icons:
	magick -background none static/favicon.svg -resize 192x192 -depth 8 -strip static/icons/icon-192.png
	magick -background none static/favicon.svg -resize 512x512 -depth 8 -strip static/icons/icon-512.png
	magick -background none static/favicon.svg -resize 384x384 -background '$(ICON_BG)' -gravity center -extent 512x512 -flatten -alpha off -depth 8 -strip static/icons/icon-maskable-512.png
	magick -background none static/favicon.svg -resize 180x180 -background '$(ICON_BG)' -flatten -alpha off -depth 8 -strip static/icons/apple-touch-icon-180.png

preview:
	npm run preview

types:
	npm run types

lint: lint-css lint-html lint-fmt lint-dead
	npm run lint

lint-css:
	npm run lint:css

lint-html:
	npm run lint:html

lint-fmt:
	npm run lint:fmt

lint-dead:
	npm run lint:dead

fmt:
	npm run format

test:
	npm test

cov:
	npm run coverage

data:
	node src/lib/catalog/interface/cli/catalog-critic.ts
	node src/lib/exercise/interface/cli/exercise-critic.ts
	node src/lib/program/interface/cli/program-critic.ts

c: types lint test cov

check: data c

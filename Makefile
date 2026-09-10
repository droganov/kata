.PHONY: i d build preview types lint lint-css lint-html lint-fmt lint-dead fmt test cov data c check

i:
	rm -rf node_modules package-lock.json && npm i && npx playwright install chromium

d:
	npm run dev

build:
	npm run build

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

c: types lint test coverage

check: data c cov

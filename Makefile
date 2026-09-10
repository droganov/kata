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
	python3 tests/test_oracle_critic.py
	python3 tools/warmup_critic.py
	python3 tools/strength_critic.py
	python3 tools/calisthenics_critic.py
	python3 tools/stretch_critic.py
	python3 tools/plan_critic.py
	python3 tools/links_critic.py
	python3 tools/build_data.py
	python3 tools/storyboard_prompt.py

c: types lint

check: data c cov

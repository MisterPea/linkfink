.PHONY: watch
watch: clean
	npm run watch

.PHONY: package
package: build
	mkdir -p dist
	zip -x\*.DS_Store dist/linkfink.zip -r style html images js vendor manifest.json

.PHONY: build
build: clean
	npm run build

.PHONY: lint
lint:
	npm exec eslint src

.PHONY: clean
clean:
	rm -rf js
	rm -rf dist

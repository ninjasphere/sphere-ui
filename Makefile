all:
	scripts/build.sh

dist:
	scripts/dist.sh

qa: vet fmt lint test

lint:
	go get github.com/golang/lint/golint
	$(GOPATH)/bin/golint ./...

fmt:
	gofmt -s -w . model controller

clean:
	rm -f bin/* || true
	rm -rf .gopath || true

test:
	go test -v ./...

vet:
	go vet ./...

here: build qa

build:
	go build -o bin/sphere-ui

.PHONY: all	dist clean test

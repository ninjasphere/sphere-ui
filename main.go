package main

import (
	"fmt"
	"net/http"

	"github.com/ninjasphere/go-ninja/config"
	"github.com/ninjasphere/go-ninja/logger"
	"github.com/ninjasphere/go-ninja/support"
)

var log = logger.GetLogger("sphere-ui")

func main() {
	fs := http.FileServer(http.Dir("public"))
	http.Handle("/", fs)

	address := fmt.Sprintf(":%d", config.Int(80, "sphere-ui.port"))
	log.Infof("Listening on %s", address)
	http.ListenAndServe(address, nil)

	support.WaitUntilSignal()
}

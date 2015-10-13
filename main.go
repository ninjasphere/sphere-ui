package main

import (
	"fmt"
	"net/http"

	"github.com/ninjasphere/go-ninja/config"
	"github.com/ninjasphere/go-ninja/logger"
	"github.com/ninjasphere/go-ninja/support"
	"github.com/ninjasphere/sphere-ui/websocket"
)

var log *logger.Logger

func main() {

	log = logger.GetLogger("sphere-ui")

	http.Handle("/config/", http.RedirectHandler("/", 307))
	http.Handle("/", http.FileServer(http.Dir("public")))

	address := fmt.Sprintf(":%d", config.Int(80, "sphere-ui.port"))
	log.Infof("Listening on %s", address)

	ws := websocket.WebsocketServer{
		Port: config.Int(9001, "sphere-ui.websocket.port"),
	}
	if err := ws.PostConstruct(); err != nil {
		log.FatalErrorf(err, "failed while starting websocket server")
	}

	if err := http.ListenAndServe(address, nil); err != nil {
		log.FatalErrorf(err, "failed while listening http server")
	}
	support.WaitUntilSignal()

}

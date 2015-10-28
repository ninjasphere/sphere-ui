package main

import (
	"fmt"
	"net"
	"net/http"
	"time"

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

	iface := config.String("", "sphere-ui.interface")

	if iface != "" {
		i, err := net.InterfaceByName(iface)
		if err != nil {
			time.Sleep(time.Second * 5)
			panic(err)
		}

		addrs, err := i.Addrs()
		if err != nil {
			time.Sleep(time.Second * 5)
			panic(err)
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue // not an ipv4 address
			}
			iface = ip.String()
		}
	}

	address := fmt.Sprintf("%s:%d", iface, config.Int(80, "sphere-ui.port"))
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

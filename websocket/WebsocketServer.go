package websocket

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/ninjasphere/go-ninja/api"
	"github.com/ninjasphere/go-ninja/bus"
	"github.com/ninjasphere/go-ninja/config"
	"github.com/ninjasphere/go-ninja/logger"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type socketCommand struct {
	Command      string            `json:"command"`
	Topic        string            `json:"topic"`
	Payload      string            `json:"payload"`
	Subscription int               `json:"subscription"`
	Params       map[string]string `json:"params"`
}

type WebsocketServer struct {
	Port int
	log  *logger.Logger
}

func (s *WebsocketServer) PostConstruct() error {
	if s.Port < 0 {
		return fmt.Errorf("illegal state: Port < 0")
	}
	s.log = logger.GetLogger("WebsocketServer")
	return s.Listen()
}

func (s *WebsocketServer) Listen() error {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {

		s.log.Debugf("Websocket incoming connection")

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			s.log.Errorf("Websocket upgrade error: %s", err)
			return
		}

		clientID := "websocket-" + r.RemoteAddr
		mqttURL := fmt.Sprintf("%s:%d", config.MustString("mqtt", "host"), config.MustInt("mqtt", "port"))

		s.log.Infof("Connecting to %s using cid:%s", mqttURL, clientID)

		mqtt := bus.MustConnect(mqttURL, clientID)

		subscriptions := make(map[int]*bus.Subscription)

		queue := make(chan *socketCommand)

		go func() {
			for {
				command := <-queue
				if command != nil {
					js, _ := json.Marshal(*command)
					if err = ws.WriteMessage(websocket.TextMessage, js); err != nil {
						s.log.Errorf("Websocket failed writing message error: %s", err)
					}
				} else {
					break
				}
			}
		}()

		send := func(command socketCommand) {
			queue <- &command
		}

		id := 0

		go func() {
			for {
				_, p, err := ws.ReadMessage()
				if err != nil {
					close(queue)
					mqtt.Destroy()
					return
				}

				var cmd socketCommand
				err = json.Unmarshal(p, &cmd)

				s.log.Debugf("Incoming ws message: %s", p)

				if cmd.Command == "unsubscribe" {
					sub, ok := subscriptions[cmd.Subscription]
					if !ok {
						send(socketCommand{
							Command: "error",
							Payload: fmt.Sprintf("Failed to unsubscribe id: %d", cmd.Subscription),
						})
					} else {
						sub.Cancel()
					}
				}

				if cmd.Command == "subscribe" {

					sid := id
					id++

					s, err := mqtt.Subscribe(ninja.GetSubscribeTopic(cmd.Payload), func(topic string, payload []byte) {

						out := socketCommand{
							Command:      "message",
							Subscription: sid,
							Payload:      string(payload),
							Topic:        topic,
						}

						if params, ok := ninja.MatchTopicPattern(cmd.Payload, topic); ok {
							out.Params = *params
						}

						send(out)
					})

					if err != nil {
						send(socketCommand{
							Command: "error",
							Payload: fmt.Sprintf("Failed to subscribe to %s: %s", cmd.Payload, err),
						})
					} else {

						subscriptions[sid] = s

						send(socketCommand{
							Command:      "suback",
							Subscription: sid,
						})
					}
				}

				if cmd.Command == "publish" {
					mqtt.Publish(cmd.Topic, []byte(cmd.Payload))
				}

			}
		}()

	})

	listenAddress := fmt.Sprintf(":%d", s.Port)

	s.log.Infof("Listening at %s", listenAddress)

	return http.ListenAndServe(listenAddress, nil)
}

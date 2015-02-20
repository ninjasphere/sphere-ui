function MqttWebSocket(host, port, cb) {
  this.host = host;
  this.port = port;

  this.socket = new WebSocket('ws://' + this.host + ':' + this.port);

  this.subscriptions = [];
  this.pending = [];

  this.requestId = 100;

  this.socket.onmessage = function(evt) {

    var cmd = JSON.parse(evt.data);

    if (cmd.command == "suback") {
      console.log("got subscription ack", cmd);
      this.pending.shift()(cmd.subscription);
    } else if (cmd.command == "message") {
      if (!this.subscriptions[cmd.subscription]) {
        console.log("missing subscription:", cmd.subscription, 'ignoring message', cmd);
      } else {
        this.subscriptions[cmd.subscription].cb(cmd);
      }
    } else if (cmd.command == "error") {
      alert("Mqtt Error: " + cmd.payload);
    }

  }.bind(this);

  this.socket.onopen = cb;
};

MqttWebSocket.prototype.request = function(topic, method, payload, cb) {
  var id = this.requestId++;

  this.subscribe(topic + '/reply', function(topic, payload, params) {
    payload = JSON.parse(payload);
    if (payload.id == id) {
      this.cancel();
      cb(payload.error, payload.result);
    }
  });

  this.publish(topic, {"method": method,"params": payload, "id": id, "jsonrpc": "2.0"});
};

MqttWebSocket.prototype.publish = function(topic, payload) {
  this.socket.send(JSON.stringify({command:"publish", topic:topic, payload:JSON.stringify(payload)}));
};

MqttWebSocket.prototype.subscribe = function(topic, cb) {
  var s = {
    topic: topic,
    cb: function(cmd) {
      cb.bind(s)(cmd.topic, cmd.payload, cmd.params);
    },
    cancel: function() {
      this.socket.send(JSON.stringify({command:"unsubscribe", subscription:s.id}));
      this.subscriptions[s.id] = null;
    }.bind(this)
  };

  this.socket.send(JSON.stringify({command:"subscribe", payload:topic}));

  this.pending.push(function(id) {
    console.log('Successfuly subscribed to topic:', topic, ' subscription id:', id);
    s.id = id;
    this.subscriptions[id] = s;
  }.bind(this));

  return s;
};

var mqtt = new MqttWebSocket('localhost', 9001, function() {

  /*s = mqtt.subscribe('node/:serial/module/:module/state/connected', function(topic, payload, params) {
    console.log('incoming2', topic, payload, params, this)

    this.cancel()
  });*/

  //mqtt.publish('something/else', {hello:123});

  //setTimeout(s.cancel.bind(s), 10000)

  function configure(topic, action, data) {
    mqtt.request(topic, 'configure', {action: action, data: data}, function(err, payload) {
      console.log("Configure reply", err, payload);

      if (err) {
        return alert("Error: " + err.message);
      }

      window.scrollTo(0,0);

      $('#out').html(C.screen(payload)).find('form').submit(function(e) {
        e.preventDefault();

        setTimeout(function() {

          var data = $(this).serializeObject();
          var action = data.action;
          delete(data.action);

          console.log('sending data', data)

          configure(topic, action, data)
        }.bind(this), 0);

      });

    })
  }

  $(function() {
    $(document).on('click', 'a[data-configure]', function(e) {
      e.preventDefault();
      configure($(this).data('configure'))
    });
  })

});

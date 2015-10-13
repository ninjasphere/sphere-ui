function MqttWebSocket(host, port, cb) {
  this.host = host;
  this.port = port;

  this.socket = new ReconnectingWebSocket('ws://' + this.host + ':' + this.port);
  this.socket.debug = true;
  this.socket.reconnectInterval = 100;
  this.socket.maxReconnectInterval = 400;

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

  var done = false;
  this.socket.onopen = function() {
    if (!done) {
      done = true;
      cb();
    }
  };

};

MqttWebSocket.prototype.request = function(topic, method, payload, cb) {
  var id = this.requestId++;

  var request = {topic: topic, method: method, params: payload, id: id, jsonrpc: '2.0'};

  this.subscribe(topic + '/reply', function(topic, payload, params) {
    payload = JSON.parse(payload);
    if (payload.id == id) {
      if (!cb(payload.error, payload.result, request)) {
        this.cancel();
      }
    }
  });

  this.publish(request.topic, request);
};

MqttWebSocket.prototype.publish = function(topic, payload) {
  console.log('Publishing', topic, payload);
  this.socket.send(JSON.stringify({command:'publish', topic:topic, payload:JSON.stringify(payload)}));
};

MqttWebSocket.prototype.subscribe = function(topic, cb) {
  var s = {
    topic: topic,
    cb: function(cmd) {
      cb.bind(s)(cmd.topic, cmd.payload, cmd.params);
    },

    cancel: function() {
      this.socket.send(JSON.stringify({command:'unsubscribe', subscription:s.id}));
      this.subscriptions[s.id] = null;
    }.bind(this),
  };

  this.socket.send(JSON.stringify({command:'subscribe', payload:topic}));

  this.pending.push(function(id) {
    console.log('Successfuly subscribed to topic:', topic, ' subscription id:', id);
    s.id = id;
    this.subscriptions[id] = s;
  }.bind(this));

  return s;
};

var mqtt = new MqttWebSocket(location.hostname, 9001, function() {

  $('#menu').show();

  /*s = mqtt.subscribe('node/:serial/module/:module/state/connected', function(topic, payload, params) {
    console.log('incoming2', topic, payload, params, this)

    this.cancel()
  });*/

  //mqtt.publish('something/else', {hello:123});

  //setTimeout(s.cancel.bind(s), 10000)

  var seenActions = {};

  mqtt.request('$discover', 'services', '/protocol/configuration', function(err, services) {
    console.log('Discovery response', err, services);

    if (err || !services || !services.length) {
      console.error('Failed to get configuration services. services:', services, 'error:', err);
      return true;
    }

    services.forEach(function(service) {
      mqtt.request(service.topic, 'getActions', null, function(err, actions) {

        if (err) {
          return console.error('Failed to get configuration actions for service', service, err);
        }

        console.log('Got config actions', actions, 'for service', service);

        actions.forEach(function(action) {
          action.topic = service.topic;

          var id = action.topic + action.name;
          if (!seenActions[id]) {
            seenActions[id] = true;
            $('#menu .actions').append(C.serviceAction(action));
          }
        });

      });
    });

    return true;
  });

  var currentTopic;

  var autoTimeouts = [];

  var automaticAction = false;

  window.onpopstate = function(event) {
    if (!event.state) {
      $('#menu').show();
      $('#out').empty();
    } else {
      automaticAction = true;
      configure(event.state.topic, event.state.params.action, event.state.params.data);
    }
  };

  function configure(topic, action, data) {

    while (timeout = autoTimeouts.pop()) {
      clearTimeout(timeout);
    }

    currentTopic = topic;

    mqtt.request(topic, 'configure', {action: action, data: data}, function(err, payload, request) {

      console.log('Got reply to request:', request, payload);

      if (!automaticAction && payload.addToHistory) {
        history.pushState(request, payload.title, '/config/' + slug(payload.title));
      }

      if (err) {
        return alert('Error: ' + err.message);
      }

      if (automaticAction) {
        window.scrollTo(0, 0);
      }

      var lastScrollPoint = $(window).scrollTop();

      $('#menu').hide();
      $('#out').html(C.screen(payload));

      if (automaticAction) {
        $(window).scrollTop(lastScrollPoint);
        automaticAction = false;
      }

      $('.autoAction').each(function(i, el) {

        var btn = $(el).find('button');
        autoTimeouts.push(setTimeout(function() {
          if (!$('#menu').is(':visible')) {
            automaticAction = true;

            console.log('Automatically submitting action', btn.data('action'));
            btn.tap();
          }
        }, btn.data('delay')));
      });

    });
  }

  $(function() {
    $(document).on('click', 'a[data-configure]', function(e) {
      e.preventDefault();
      configure($(this).data('configure'), $(this).data('action'))
    });

    $(document).on('submit', 'form', function(e) {

      console.log('onsubmit')

      e.preventDefault();

      setTimeout(function() {

        var data = $(this).serializeObject();
        var action = data.action || "";
        delete(data.action);

        if (action == 'close') {
          return;
        }

        console.log('sending data', data)

        configure(currentTopic, action, data)
      }.bind(this), 0);

    });
  })

});

var slug = function(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to   = "aaaaaeeeeeiiiiooooouuuunc------";
  for (var i=0, l=from.length ; i<l ; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
};

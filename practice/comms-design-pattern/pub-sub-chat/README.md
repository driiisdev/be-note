# Practice: Pub/Sub Chat Broker

Concept note: [`concepts/comms design pattern/pub-sub.md`](<../../../concepts/comms design pattern/pub-sub.md>)

## What this demonstrates

A minimal message broker from scratch — no Redis, no MQTT library — so the mechanics of
topic-based fan-out are visible instead of hidden behind a client library.

## Scenario

A chat server where clients join named rooms. Publishing a message to a room only reaches
clients subscribed to *that* room — the broker never sends everyone everything.

## Folder structure

```
pub-sub-chat/
  broker.js       <- TCP server: tracks topic -> [connected sockets], routes messages
  publisher.js    <- connects, sends SUBSCRIBE + PUBLISH commands from stdin
  subscriber.js   <- connects, sends SUBSCRIBE, then just prints whatever arrives
```

## Protocol (deliberately simple — plain text lines)

```
SUBSCRIBE <topic>              client -> broker
PUBLISH <topic> <message...>   client -> broker
MSG <topic> <message...>       broker -> subscribed clients
```

## Code walkthrough

**`broker.js`** — the entire pattern is this map and two functions:

```js
const subscribers = new Map(); // topic -> Set<socket>

function subscribe(socket, topic) {
  if (!subscribers.has(topic)) subscribers.set(topic, new Set());
  subscribers.get(topic).add(socket);
}

function publish(topic, message) {
  const sockets = subscribers.get(topic) || new Set();
  for (const socket of sockets) socket.write(`MSG ${topic} ${message}\n`);
}
```

Note the publisher never touches `sockets` directly — it only ever calls `publish(topic, msg)`.
It has no idea who (or how many clients) will receive it. That decoupling is the entire point
of pub/sub.

## Run it

```bash
# terminal 1 — the broker
node broker.js

# terminal 2 — join room "general" and just listen
node subscriber.js general

# terminal 3 — join room "random" (different room, on purpose)
node subscriber.js random

# terminal 4 — publish into "general"
node publisher.js general "hello everyone"
```

## What to observe

- The message you publish in terminal 4 shows up in terminal 2 (subscribed to `general`) but
  **not** terminal 3 (subscribed to `random`) — that's the topic-scoped fan-out.
- Open a second subscriber on `general` — both instances get the same message, independently.
- Kill a subscriber terminal (Ctrl+C) and publish again — the broker should log the dropped
  connection and stop trying to write to it (real brokers need exactly this cleanup, or they
  leak memory holding references to dead sockets).

## Try this yourself

- Add an `UNSUBSCRIBE <topic>` command.
- Make a subscriber able to join multiple topics at once.
- Add a topic list command so a new client can discover what topics currently have traffic.

## Real-world equivalent

Redis Pub/Sub, MQTT brokers (IoT), Kafka topics (with way more durability/ordering
guarantees than this toy version), and Slack/Discord's internal fan-out of a channel message
to every connected client in that channel.

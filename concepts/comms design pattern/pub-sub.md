# Pub/Sub (Publish-Subscribe)

Once you have [push](<push.md>) working for one client, the next problem is: how does the
server push *different* things to *different* groups of clients, without every publisher
needing to know who's currently listening? Pub/sub answers that with a middleman - a
**broker** - and **topics**.

## How it works

1. Clients that want to *receive* messages **subscribe** to a topic (e.g. `"order.123"`,
   `"chat.general"`) through a broker.
2. Clients that want to *send* messages **publish** to a topic - they don't send directly to
   any specific subscriber, and don't even need to know who (or how many) is listening.
3. The broker keeps a mapping of topic → currently subscribed clients.
4. When a message is published to a topic, the broker **fans it out** to every current
   subscriber of that topic.

Publishers and subscribers are fully decoupled: a publisher only knows about the broker and a
topic name, never about individual subscribers. This is the key structural difference from
plain [push](<push.md>), where the server usually knows exactly who it's pushing to.

## Where it's used

- Chat apps / chat rooms (one topic per room)
- Message brokers: Redis Pub/Sub, Kafka, RabbitMQ, MQTT (IoT)
- Event-driven microservices (a service publishes "OrderCreated", any number of other
  services subscribe without the publisher knowing they exist)
- Live UI updates scoped to a resource (e.g. only clients viewing order #123 get notified
  when it changes, not every connected client)

## Pros / Cons

**Pros:** publishers and subscribers are decoupled (neither needs to know about the other,
just the topic); adding a new subscriber never requires changing the publisher; naturally
scopes updates (only interested clients get the traffic).

**Cons:** the broker becomes a new piece of infrastructure to run, monitor, and scale;
message delivery guarantees vary a lot by implementation (fire-and-forget vs at-least-once vs
exactly-once - worth checking which one you're actually getting); debugging is harder because
there's no direct line between "who sent this" and "who received it", you have to reason
through the broker.

🖼️ **pub sub pattern diagram broker topics**
![pub sub pattern diagram](<../../assets/img/pub sub.png>)

## Practice project

[`practice/comms-design-pattern/pub-sub-chat`](../../practice/comms-design-pattern/pub-sub-chat) -
a small TCP broker (Node's `net` module) that lets clients `SUBSCRIBE <topic>` and
`PUBLISH <topic> <message>`, fanning messages out only to subscribers of that topic - a
minimal, from-scratch stand-in for what Redis Pub/Sub or an MQTT broker does.

## Related

- [Push](<push.md>) - the delivery mechanism pub/sub is built on top of (a subscriber's
  connection to the broker is itself a push connection).
- [Sidecar pattern](<sidecar-pattern.md>) - in real systems, the pub/sub client (connection
  management, retries, reconnects) is sometimes pulled out into a sidecar so application code
  doesn't have to deal with broker connection details directly.

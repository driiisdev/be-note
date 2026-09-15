# Polling

Polling is what you do when you want "live" updates but the only tool you have is
request-response, which can't be pushed to. The client fakes it by just asking over and over.

## How it works

1. Client sends a request: "anything new?"
2. Server answers immediately with whatever it currently has - even if that's "no change".
3. Client waits a fixed interval (e.g. every 5 seconds).
4. Repeat forever.

Every single request is a complete, independent request-response cycle (see
[request-response](<request-response.md>)) - the server never remembers that the client
already asked, and doesn't hold the connection open.

## Where it's used

- Old-school "check for new email" clients
- Dashboards refreshing metrics every N seconds
- CI systems polling a job queue for status
- Anywhere "good enough" freshness beats real-time, and simplicity is worth more than efficiency

## Pros / Cons

**Pros:** trivial to implement, works through any firewall/proxy that allows plain HTTP,
stateless on the server (no held-open connections to manage).

**Cons:**
- **Wasted requests.** Most polls return "nothing changed" - pure overhead.
- **Latency vs load tradeoff.** Poll faster → fresher data but more load. Poll slower →
  less load but staler data. You can't win both at once.
- Doesn't scale well: N clients × polls/sec adds up fast even when nothing is happening.

🖼️ **polling vs long polling diagram**
![polling](../../assets/img/polling.png)

## Practice project

[`practice/comms-design-pattern/notification-delivery`](../../practice/comms-design-pattern/notification-delivery) -
polling is implemented as one of four variants of the same "check order status" scenario, so
you can compare it directly against long polling, SSE, and push.

## Related

- [Long polling](<long-polling.md>) - same idea, but the server delays its reply instead of
  answering instantly, cutting down on wasted requests.
- [Server-sent events](<server-sent-events.md>) and [Push](<push.md>) - the server initiates
  updates instead of the client having to ask.

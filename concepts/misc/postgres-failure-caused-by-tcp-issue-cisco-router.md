# Postgres Failure Caused by a TCP Issue at the Router Level

A note on scope before anything else: this is written up as the **general class of failure**
this kind of war story illustrates, not a citation of one specific documented incident with
exact dates, company names, or packet traces — I don't have reliable specifics for the exact
lecture anecdote this topic is named after, and I'd rather be accurate about the *mechanism*
than invent false precision about *whose* outage it was. If the course covers a specific,
named incident, that detail is worth adding here directly from your notes.

## The setup

A connection pool — application-side, or a dedicated pooler like PgBouncer — holds open,
persistent TCP connections to Postgres, specifically to avoid the cost of establishing a new
connection (TCP handshake, then Postgres's own auth handshake) for every single query. Those
pooled connections routinely sit **idle** between queries — that's the entire point of pooling.

## The failure mechanism

An intermediate network device sitting between the application and the database — a router,
firewall, or NAT gateway — very often maintains its **own** connection-tracking table
(`conntrack`, or equivalent), with its **own** idle timeout, independent of and usually much
shorter than what either the application or Postgres itself expects.

If a pooled connection sits idle past *that device's* timeout, the device can silently evict
its own tracking entry for it — **without notifying either endpoint**. No `RST`, no `FIN`, sent
to neither the application nor Postgres.

## Why this is so nasty to debug

Both the application's connection pool and Postgres still believe the connection is alive —
each side's own local TCP state machine still shows `ESTABLISHED`, because from each endpoint's
own point of view, nothing happened. The next time the application actually tries to *use* that
connection to send a query, the packet is sent into a network path that no longer has any
record of that connection — and simply vanishes. No error arrives. The application hangs or
times out waiting for a response that is never coming, which looks exactly like "the database
is unresponsive," even though Postgres itself is completely healthy and has no idea anything is
wrong either.

Nothing logs an error *at the moment of failure*, because from a strict protocol point of view,
nothing failed yet — the symptom only surfaces later, as a mysterious hang, and it's easy to
mistake for a real database performance problem rather than a network-layer connection death.

## The fix: TCP keepalive

Both the application-side pool and Postgres itself can be configured to periodically send small
**keepalive** probes on connections that have been idle for a while
(`tcp_keepalives_idle` / `tcp_keepalives_interval` / `tcp_keepalives_count` on the Postgres
side; `socket.setKeepAlive()` at the application/Node level). This does two things:

1. **Keeps the intermediate device's tracking entry alive** — a periodic probe means the
   connection never looks idle long enough to get silently evicted in the first place.
2. **Surfaces a genuinely dead connection immediately** — if the connection really is gone, the
   keepalive probe itself fails fast, and the application finds out right away instead of
   discovering it only when a real query silently hangs.

🖼️ **Image needed:** a sequence diagram — app, router/NAT, and Postgres, with the router
silently dropping its tracking entry for an idle connection while both endpoints still show
`ESTABLISHED`, followed by a query vanishing into the network. Search: "nat conntrack timeout
silent connection drop diagram".

## Practice project

[`practice/misc/kernel-connection-internals`](../../practice/misc/kernel-connection-internals) —
demonstrates configuring TCP keepalive on a Node socket (`setKeepAlive`), the concrete mitigation
this class of failure calls for, even though the router-level failure itself can't be reproduced
without real network hardware.

## Related

- [TCP](<../protocols/tcp.md>) — the connection state this failure mode silently corrupts.
- [How does the kernel manage backend connections](<how-does-the-kernel-manage-backend-connections.md>) —
  why each endpoint's local view of "connected" can diverge from network reality.

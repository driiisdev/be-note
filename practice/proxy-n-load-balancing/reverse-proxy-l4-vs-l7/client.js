const http = require("http");

function get(port, path) {
  return new Promise((resolve) => {
    http.get({ host: "localhost", port, path }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body.trim()));
    });
  });
}

async function main() {
  console.log("=== hitting the L7 proxy (:8000) with /a/foo then /b/bar ===");
  console.log("/a/foo ->", await get(8000, "/a/foo"));
  console.log("/b/bar ->", await get(8000, "/b/bar"));
  console.log("notice: L7 correctly routed each path to the backend its route says it should\n");

  console.log("=== hitting the L4 proxy (:8010) with the SAME path /a/foo, twice, as separate connections ===");
  console.log("/a/foo (1st connection) ->", await get(8010, "/a/foo"));
  console.log("/a/foo (2nd connection) ->", await get(8010, "/a/foo"));
  console.log("notice: the SAME path landed on TWO DIFFERENT backends - proof the L4 proxy picked");
  console.log("the backend by connection round-robin alone, completely blind to what path was in");
  console.log("the request (if it were path-aware like L7, both would have hit the same backend)");
}

main();

const { fibonacci } = require("./cpu-work");

process.on("message", (n) => {
  process.send(fibonacci(n));
});

// test-route.js
const http = require("http");

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/websites/32/website-pages",
  method: "GET",
  headers: {
    Cookie: "connect.sid=s%3AyourSessionId.signature", // You'll need a valid session
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Response body:", data);
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();

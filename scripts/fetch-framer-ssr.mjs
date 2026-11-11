import fs from "fs";
import path from "path";
import https from "https";

const OUT = path.join(process.cwd(), "scripts", "framer-live.html");
const URL = "https://framebloxpages.framer.website/landing/06";

https
  .get(URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`HTTP ${res.statusCode}`);
      process.exit(1);
    }
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      fs.writeFileSync(OUT, Buffer.concat(chunks), "utf8");
      console.log(`Saved ${OUT} (${(Buffer.concat(chunks).length / 1024).toFixed(0)} KB)`);
    });
  })
  .on("error", (err) => {
    console.error(err.message);
    process.exit(1);
  });

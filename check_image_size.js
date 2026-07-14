import https from "https";

const url = "https://res.cloudinary.com/dpgykcvsj/image/upload/v1780563439/Group_1000002194_1_2_mgsjd1.png";

https.get(url, (res) => {
  let chunks = [];
  res.on("data", (chunk) => {
    chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (buffer.length >= 24) {
      // PNG header: signature (8 bytes), IHDR chunk length (4 bytes), IHDR chunk type "IHDR" (4 bytes), width (4 bytes), height (4 bytes)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      console.log(`Image actual dimensions: Width = ${width}, Height = ${height}`);
      res.destroy(); // stop downloading
    }
  });
}).on("error", console.error);

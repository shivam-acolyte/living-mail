import fs from "fs";

const run = async () => {
  const url = "http://localhost:5000/track/form/c2F1cmFiaHNpbmdoODQ3MTAxQGdtYWlsLmNvbQ.bWFya2V0aW5nLWNh.9e79ded621102bd607f6";
  try {
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync("downloaded_form.html", text);
    console.log("Downloaded successfully to downloaded_form.html");
  } catch (err) {
    console.error("Download failed:", err.message);
  }
};

run();

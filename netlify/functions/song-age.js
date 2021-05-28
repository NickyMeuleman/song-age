require("dotenv").config();
const { builder } = require("@netlify/functions");
const fetch = require("node-fetch");

function getHTML({ name, year, url }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>In ${year}, ${name} was released — Song Age</title>
      <link rel="stylesheet" href="/assets/styles.css" />
    </head>
    <body>
      <header>
        <nav>
          <a href="/" rel="home">Song Age</a>
        </nav>
      </header>
      <main>
        <p id="released">
          <a href=${url}>${name}</a> was released in <span>${year}</span>.
        </p>
        <p>That was <span id="age">0</span> years ago</p>
      </main>
      <script>
        const yearEl = document.getElementById("age");
        yearEl.textContent = new Date().getFullYear() - ${year};
      </script>
    </body>
  </html>
  `;
}

async function getReleaseInfo({ track, artist }) {
  let url = new URL("https://api.discogs.com/database/search");
  let searchParams = new URLSearchParams();
  searchParams.append("key", process.env.DISCOGS_CONSUMER_KEY);
  searchParams.append("secret", process.env.DISCOGS_CONSUMER_SECRET);
  searchParams.append("artist", artist);
  searchParams.append("track", track);
  searchParams.append("per_page", 10);
  url.search = searchParams;

  const data = await fetch(url).then((res) => res.json());
  // or a filter and a spread in Math.min, whatever, something for Twitter to be mad about
  const info = data.results.reduce(
    (acc, item) => {
      const itemYear = parseInt(item.year);
      const itemUrl = "https://www.discogs.com" + item.uri;

      if (Number.isNaN(itemYear)) {
        return acc;
      }
      const newYear = Math.min(acc.year, itemYear);
      if (Number.isNaN(newYear)) {
        return acc;
      }
      
      return { name: item.title, year: newYear, url: itemUrl };
    },
    { name: "", year: Infinity, url: "" }
  );

  return info;
}

const handler = async (event) => {
  const { path } = event;
  const [, artist, track] = path.split("/");
  const info = await getReleaseInfo({
    track: decodeURIComponent(track),
    artist: decodeURIComponent(artist),
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
    },
    body: getHTML(info),
  };
};

exports.handler = builder(handler);

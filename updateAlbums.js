import fs from "fs";

const PLAYLISTS = [
  { name: "pm2", id: "pl.u-xlyNjvVtkpmLMy" },
  { name: "pm5", id: "pl.u-oZyl4JguR06J4K" }
];

async function fetchPlaylist(id) {
  const res = await fetch(
    `https://amp-api.music.apple.com/v1/catalog/kr/playlists/${id}`
  );

  return res.json();
}

const result = [];

for (const p of PLAYLISTS) {
  const data = await fetchPlaylist(p.id);

  const albums =
    data.data[0].relationships.tracks.data.map(t => ({
      title: t.attributes.albumName,
      artist: t.attributes.artistName,
      cover: t.attributes.artwork.url
        .replace("{w}", "600")
        .replace("{h}", "600"),
      url: t.attributes.url
    }));

  result.push({
    category: p.name,
    albums
  });
}

fs.writeFileSync(
  "./data/albums.json",
  JSON.stringify(result, null, 2)
);
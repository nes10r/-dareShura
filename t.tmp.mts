const { parseListing, get } = await import("./src/lib/conferences/source");
console.log(parseListing(await get("/elan/86-konfrans")).length, parseListing(await get("/elan/87-musabigae"), "/elan/87-musabigae").slice(0, 2));

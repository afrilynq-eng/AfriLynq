/**
 * Photographs by slug.
 *
 * Paste a URL between the quotes and the picture appears. Leave it empty and
 * the site falls back to a plain tile. Nothing else to do.
 *
 * Two kinds of URL work:
 *
 *   1. An Unsplash page address, copied straight from the browser bar:
 *      "https://unsplash.com/photos/a-pile-of-seeds-lXqAqfvOJ6M"
 *
 *   2. A direct link to an image file, ending in .jpg, .png or .webp:
 *      "https://example.com/photos/sesame.jpg"
 *
 * There is a third and better option: save the file into public/photos/
 * instead. See public/photos/README.md. A local file always beats anything in
 * this list, so you can start with URLs here and replace them with real
 * photography later without touching this file again.
 *
 * ON LICENSING. Unsplash permits commercial use with no attribution, so it is
 * safe. iStock, Getty, Shutterstock and Adobe Stock all require a paid
 * licence, and putting a preview file on a live site is infringement no matter
 * how temporary it is or which host it sits on. Re-uploading a picture
 * somewhere else does not change where it came from.
 *
 * Unsplash also does not verify model releases, so prefer produce, hands,
 * sacks and landscapes over photographs where a face is clearly identifiable,
 * at least until AfriLynq has its own photography.
 *
 * WHERE TO LOOK. Open unsplash.com and search these terms:
 *
 *   hero .......................... cocoa farmer, african farmer harvest
 *   about ......................... african agriculture, farm cooperative
 *   verification .................. food quality inspection, warehouse
 *   discover ...................... african market produce
 *   connect ....................... farmers shaking hands, handshake field
 *   trade ......................... farmer tablet, business meeting farm
 *   deliver ....................... loading truck crates, produce logistics
 *   grains-and-seeds .............. sesame seeds, grain sacks
 *   spices-and-botanicals ......... dried spices, spice market
 *   nuts-and-superfoods ........... cashew nuts, raw nuts
 *   cocoa-and-natural-ingredients . cocoa beans, cacao pods
 *   oils .......................... palm oil, cooking oil bottles
 *   roots-and-processed-foods ..... cassava, yam tubers
 *   seafood-and-animal-products ... dried fish, smoked fish
 *
 * Product terms are mostly the product name itself. For the West African ones
 * that Unsplash does not cover well, such as garri, egusi or bambara nuts, a
 * near neighbour reads fine: "cassava flour", "melon seeds", "groundnuts".
 */

export const REMOTE_PHOTOS: Record<string, string> = {
  // Site
  hero: "https://images.unsplash.com/photo-1781453640130-3430f4a2815f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  about: "https://images.unsplash.com/photo-1744726010540-bf318d4a691f?q=80&w=1062&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  verification: "https://images.unsplash.com/photo-1779517935094-f2e9c8ae3c78?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    buyers: "https://images.unsplash.com/photo-1599033183537-54ff77f58f75?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  farmers: "https://images.unsplash.com/photo-1622676566956-b42b50c84c31?q=80&w=764&auto=format&fit=crop",

  // How it works, the four numbered cards on the home page
  discover: "https://images.unsplash.com/photo-1734255026082-82fdc81991f0?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  connect: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  trade: "https://images.unsplash.com/photo-1758524051910-60a8d324e110?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  deliver: "https://images.unsplash.com/photo-1730376319010-4ce5b8b2e385?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Categories
  "grains-and-seeds": "https://images.unsplash.com/photo-1734255074937-4b446b8dcf18?q=80&w=737&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "spices-and-botanicals": "https://images.unsplash.com/photo-1532336414038-cf19250c5757?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "nuts-and-superfoods": "https://images.unsplash.com/photo-1726771517475-e7acdd34cd8a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "cocoa-and-natural-ingredients": "https://images.unsplash.com/photo-1573710661345-610f790e1218?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  oils: "https://images.unsplash.com/photo-1552710218-bd32b0c98626?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "roots-and-processed-foods": "https://images.unsplash.com/photo-1757281096972-10fd02b0f5ea?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "seafood-and-animal-products": "https://images.unsplash.com/photo-1736182146403-b8db599f8dda?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Grains and seeds
  sesame: "https://images.unsplash.com/photo-1628317321557-68729bee6644?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  soybeans: "https://images.unsplash.com/photo-1639843606783-b2f9c50a7468?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  groundnuts: "https://images.unsplash.com/photo-1524594345772-c953a3ae53e8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  beans: "https://images.unsplash.com/photo-1579705745811-a32bef7856a3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  millet: "https://images.unsplash.com/photo-1633101143189-d28a58810351?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  sorghum: "https://images.unsplash.com/photo-1714469914199-14ab69eae5f3?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Spices and botanicals
  ginger: "https://images.unsplash.com/photo-1573414405995-2012861b74e0?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  turmeric: "https://images.unsplash.com/photo-1768729341078-9da4e0ea959e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  chilli: "https://images.unsplash.com/photo-1776722203163-41b9ff375292?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  hibiscus: "https://images.unsplash.com/photo-1652128288793-6a2077ee246b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  moringa: "https://images.unsplash.com/photo-1650494701391-daceb922ce9d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Nuts and superfoods
  cashew: "https://images.unsplash.com/photo-1573555657105-47a0bb37c3ea?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "tiger-nuts": "https://images.unsplash.com/photo-1477506350614-fcdc29a3b157?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "shea-nuts": "https://images.unsplash.com/photo-1560660071-a31178d86990?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "bambara-nuts": "https://images.unsplash.com/photo-1658572194016-f4095364b390?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Cocoa and natural ingredients
  "cocoa-beans": "https://images.unsplash.com/photo-1493925410384-84f842e616fb?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "cocoa-powder": "https://images.unsplash.com/photo-1565498971161-42ae3dbcca75?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "cocoa-butter": "https://images.unsplash.com/photo-1638194645412-1d0b4c53ffed?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Oils
  "palm-oil": "https://images.unsplash.com/photo-1552710218-bd32b0c98626?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "palm-kernel-oil": "https://images.unsplash.com/photo-1604302882991-b75900e23890?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "sesame-oil": "https://images.unsplash.com/photo-1558458580-23a6eb22a071?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "groundnut-oil": "https://images.unsplash.com/photo-1552592074-ea7a91b851b3?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Roots and processed foods
  garri: "https://images.unsplash.com/photo-1710857389305-5cba9211033f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "cassava-flour": "https://images.unsplash.com/photo-1647018763651-e32158974419?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "cassava-chips": "https://images.unsplash.com/photo-1686204040685-f7a2bc30d1fd?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  yam: "https://images.unsplash.com/photo-1764143914716-3524db64940e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "yam-flour": "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "plantain-flour": "https://images.unsplash.com/photo-1501812271548-22b85c830741?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  potato: "https://images.unsplash.com/photo-1730815048561-45df6f7f331d?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  // Seafood and animal products
  "dried-fish": "https://images.unsplash.com/photo-1736182146384-72e77abe44ec?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "smoked-fish": "https://images.unsplash.com/photo-1763252500638-dec84060e644?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  prawns: "https://images.unsplash.com/photo-1578069744397-2f3942a02a7b?q=80&w=435&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  honey: "https://images.unsplash.com/photo-1671548185843-3f50c6c1060b?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  beeswax: "https://images.unsplash.com/photo-1702495464926-0085637df194?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "hides-and-skins": "https://images.unsplash.com/photo-1451930348779-424a8e3c7835?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

/**
 * Turn whatever was pasted into an address the site can serve.
 *
 * Unsplash page addresses end in a photo id, and the file itself lives on
 * images.unsplash.com, so those are converted. Anything else that is already
 * a direct https link to an image is passed through unchanged.
 */
export function toImageUrl(input: string): string | null {
  const value = input?.trim();
  if (!value) return null;

  // Already the image host: use as is.
  if (value.startsWith("https://images.unsplash.com/")) return value;

  // An Unsplash page address. The id is the last chunk after the final dash.
  const unsplash = value.match(
    /^https:\/\/unsplash\.com\/(?:[a-z-]+\/)?photos\/(?:[\w-]*-)?([A-Za-z0-9_-]{11,})\/?/
  );
  if (unsplash) {
    return `https://images.unsplash.com/photo-${unsplash[1]}?auto=format&fit=crop&w=1400&q=70`;
  }

  // Any other direct link to an image file.
  if (/^https:\/\/.+\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(value)) return value;

  // Anything else, including page addresses on other sites, is not usable.
  return null;
}

-- AfriLynq platform
-- Migration 0008: replace the launch categories
--
-- AfriLynq supplied its own category and product list on 6 September 2026,
-- which supersedes the working list seeded in seed.sql. Apply this to a
-- database that has already been seeded. A fresh database gets the corrected
-- list directly from seed.sql.
--
-- Old categories are deactivated rather than deleted, because products
-- reference them with on delete restrict and because a slug that has been
-- published should keep resolving rather than start returning a 404.

update public.categories
set is_active = false
where slug in (
  'fresh-produce',
  'grains-and-cereals',
  'nuts-and-seeds',
  'spices-and-herbs',
  'cocoa-and-coffee',
  'oils-and-fats',
  'processed-foods'
);

insert into public.categories (slug, name, description, sort_order) values
  ('grains-and-seeds',              'Grains and seeds',              'Sesame, soybeans, groundnuts, beans, millet and sorghum', 10),
  ('spices-and-botanicals',         'Spices and botanicals',         'Ginger, turmeric, chilli, hibiscus and moringa', 20),
  ('nuts-and-superfoods',           'Nuts and superfoods',           'Cashew, tiger nuts, shea nuts and bambara nuts', 30),
  ('cocoa-and-natural-ingredients', 'Cocoa and natural ingredients', 'Cocoa beans, cocoa powder and cocoa butter', 40),
  ('oils',                          'Oils',                          'Palm, palm kernel, sesame and groundnut oil', 50),
  ('roots-and-processed-foods',     'Roots and processed foods',     'Garri, cassava flour and chips, yam, yam flour, plantain flour and potato', 60),
  ('seafood-and-animal-products',   'Seafood and animal products',   'Dried and smoked fish, prawns, honey, beeswax, hides and skins', 70)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_active = true;

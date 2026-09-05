-- AfriLynq platform
-- Seed: reference data only. No fake companies, no fake products.
--
-- Countries, currencies and units are data rather than code so that opening a
-- new market is an insert. Add rows here, never a constant in the application.

insert into public.countries (code, name, region, dial_code, is_supplier_market, is_buyer_market, sort_order) values
  ('GB', 'United Kingdom',  'Europe',       '+44', false, true,  1),
  ('NG', 'Nigeria',         'West Africa',  '+234', true, false, 10),
  ('GH', 'Ghana',           'West Africa',  '+233', true, false, 11),
  ('CI', 'Cote d Ivoire',   'West Africa',  '+225', true, false, 12),
  ('CM', 'Cameroon',        'Central Africa','+237', true, false, 13),
  ('KE', 'Kenya',           'East Africa',  '+254', true, false, 20),
  ('UG', 'Uganda',          'East Africa',  '+256', true, false, 21),
  ('TZ', 'Tanzania',        'East Africa',  '+255', true, false, 22),
  ('ET', 'Ethiopia',        'East Africa',  '+251', true, false, 23),
  ('RW', 'Rwanda',          'East Africa',  '+250', true, false, 24),
  ('ZA', 'South Africa',    'Southern Africa','+27', true, false, 30),
  ('EG', 'Egypt',           'North Africa', '+20',  true, false, 40),
  ('IE', 'Ireland',         'Europe',       '+353', false, true, 2),
  ('NL', 'Netherlands',     'Europe',       '+31',  false, true, 3),
  ('DE', 'Germany',         'Europe',       '+49',  false, true, 4),
  ('FR', 'France',          'Europe',       '+33',  false, true, 5),
  ('US', 'United States',   'North America','+1',   false, true, 6),
  ('AE', 'United Arab Emirates', 'Middle East', '+971', false, true, 7)
on conflict (code) do nothing;

insert into public.currencies (code, name, symbol, minor_units) values
  ('GBP', 'Pound Sterling',  'GBP ', 2),
  ('USD', 'US Dollar',       'USD ', 2),
  ('EUR', 'Euro',            'EUR ', 2),
  ('NGN', 'Nigerian Naira',  'NGN ', 2),
  ('GHS', 'Ghanaian Cedi',   'GHS ', 2),
  ('KES', 'Kenyan Shilling', 'KES ', 2),
  ('ZAR', 'South African Rand', 'ZAR ', 2)
on conflict (code) do nothing;

insert into public.units (code, name, plural_name, unit_family, sort_order) values
  ('kg',        'Kilogram',        'Kilograms',        'weight', 1),
  ('tonne',     'Metric tonne',    'Metric tonnes',    'weight', 2),
  ('g',         'Gram',            'Grams',            'weight', 3),
  ('lb',        'Pound',           'Pounds',           'weight', 4),
  ('bag_25kg',  'Bag (25 kg)',     'Bags (25 kg)',     'pack',   10),
  ('bag_50kg',  'Bag (50 kg)',     'Bags (50 kg)',     'pack',   11),
  ('carton',    'Carton',          'Cartons',          'pack',   12),
  ('crate',     'Crate',           'Crates',           'pack',   13),
  ('pallet',    'Pallet',          'Pallets',          'pack',   14),
  ('container_20ft', 'Container (20 ft)', 'Containers (20 ft)', 'shipping', 20),
  ('container_40ft', 'Container (40 ft)', 'Containers (40 ft)', 'shipping', 21),
  ('litre',     'Litre',           'Litres',           'volume', 30),
  ('unit',      'Unit',            'Units',            'count',  40)
on conflict (code) do nothing;

-- Launch categories. Confirm the final list with AfriLynq before going live.
insert into public.categories (slug, name, description, sort_order) values
  ('fresh-produce',      'Fresh Produce',      'Fruit and vegetables for export', 10),
  ('grains-and-cereals', 'Grains and Cereals', 'Rice, maize, sorghum, millet and related crops', 20),
  ('nuts-and-seeds',     'Nuts and Seeds',     'Cashew, sesame, groundnut, shea and related crops', 30),
  ('spices-and-herbs',   'Spices and Herbs',   'Ginger, turmeric, chilli, dried herbs', 40),
  ('cocoa-and-coffee',   'Cocoa and Coffee',   'Cocoa beans, coffee beans and derivatives', 50),
  ('oils-and-fats',      'Oils and Fats',      'Palm oil, groundnut oil, shea butter', 60),
  ('processed-foods',    'Processed Foods',    'Dried, milled and packaged food products', 70)
on conflict (slug) do nothing;

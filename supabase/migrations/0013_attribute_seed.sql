-- =====================================================================
-- The starting attribute set, and Dress Materials
-- =====================================================================
-- Seeded rather than hardcoded: every one of these is editable, and the
-- point of the exercise is that the next product line needs none of this
-- file — only rows added through the admin.
--
-- Safe to re-run. Attributes and options upsert on their natural keys, and
-- the backfill at the end only writes where a product has no value yet.

-- --------------------------------------------------- Dress Materials
-- Distinct from Unstitched in this shop: unstitched is cloth by the metre,
-- a dress material is a matched set sold to be tailored.
insert into categories (name, slug, description, parent_id, sort_order, nav_group)
select 'Dress Materials', 'dress-materials',
       'Matched sets sold to be tailored to fit.',
       c.id, 3, 'standalone'
from (select id from categories where slug = 'churidars') as c
on conflict (slug) do update set parent_id = excluded.parent_id;

-- ------------------------------------------------------- attributes
insert into attributes (name, slug, input_type, unit, is_filterable, help_text, sort_order) values
  ('Fabric',        'fabric',        'dropdown',        null, true,  'The primary cloth.',                              10),
  ('Colour',        'colour',        'dropdown',        null, true,  null,                                              20),
  ('Pattern',       'pattern',       'dropdown',        null, true,  null,                                              30),
  ('Occasion',      'occasion',      'multiselect',     null, true,  'A piece can suit more than one.',                  40),
  ('Weave',         'weave',         'dropdown',        null, true,  null,                                              50),
  ('Saree Length',  'saree-length',  'measurement',     'm',  false, 'Cut length including the blouse piece.',           60),
  ('Blouse Piece',  'blouse-piece',  'boolean',         null, true,  'Whether a blouse piece is attached.',              70),
  ('Kurta Length',  'kurta-length',  'measurement',     'in', true,  null,                                              80),
  ('Sleeve Type',   'sleeve-type',   'dropdown',        null, true,  null,                                              90),
  ('Neck Type',     'neck-type',     'dropdown',        null, true,  null,                                             100),
  ('Bottom Type',   'bottom-type',   'dropdown',        null, true,  null,                                             110),
  ('Dupatta',       'dupatta',       'boolean',         null, true,  'Whether a dupatta is included.',                  120),
  ('Wash Care',     'wash-care',     'dropdown_custom', null, false, 'Pick one, or write your own instructions.',       130)
on conflict (slug) do update
  set name = excluded.name,
      input_type = excluded.input_type,
      unit = excluded.unit,
      is_filterable = excluded.is_filterable,
      help_text = excluded.help_text,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------- options
insert into attribute_options (attribute_id, value, sort_order)
select a.id, v.value, v.sort_order
from (values
  ('fabric','Pure Mulberry Silk',10),('fabric','Kanchipuram Silk',20),('fabric','Banarasi Silk',30),
  ('fabric','Tussar Silk',40),('fabric','Silk Cotton',50),('fabric','Khadi Cotton',60),
  ('fabric','Handloom Cotton',70),('fabric','Chanderi',80),('fabric','Maheshwari',90),
  ('fabric','Organza',100),('fabric','Georgette',110),('fabric','Crepe',120),('fabric','Linen',130),
  ('fabric','Rayon',140),('fabric','Modal',150),('fabric','Viscose',160),('fabric','Chiffon',170),
  ('fabric','Cotton Blend',180),('fabric','Silk Blend',190),('fabric','Art Silk',200),

  ('colour','Red',10),('colour','Maroon',20),('colour','Pink',30),('colour','Orange',40),
  ('colour','Yellow',50),('colour','Green',60),('colour','Blue',70),('colour','Navy',80),
  ('colour','Purple',90),('colour','Black',100),('colour','White',110),('colour','Cream',120),
  ('colour','Gold',130),('colour','Silver',140),('colour','Grey',150),('colour','Brown',160),
  ('colour','Multicolour',170),

  ('pattern','Plain',10),('pattern','Zari Border',20),('pattern','Temple Border',30),
  ('pattern','Checked',40),('pattern','Striped',50),('pattern','Floral',60),
  ('pattern','Block Print',70),('pattern','Hand Painted',80),('pattern','Embroidered',90),
  ('pattern','Brocade',100),('pattern','Jaal',110),

  ('occasion','Everyday',10),('occasion','Office',20),('occasion','Festive',30),
  ('occasion','Wedding',40),('occasion','Bridal',50),('occasion','Temple',60),

  ('weave','Handloom',10),('weave','Powerloom',20),('weave','Korvai',30),
  ('weave','Kadhwa',40),('weave','Jamdani',50),

  ('sleeve-type','Sleeveless',10),('sleeve-type','Cap Sleeve',20),('sleeve-type','Short Sleeve',30),
  ('sleeve-type','Three Quarter',40),('sleeve-type','Full Sleeve',50),('sleeve-type','Bell Sleeve',60),

  ('neck-type','Round Neck',10),('neck-type','V Neck',20),('neck-type','Boat Neck',30),
  ('neck-type','Collar',40),('neck-type','Mandarin',50),('neck-type','Sweetheart',60),

  ('bottom-type','Churidar',10),('bottom-type','Palazzo',20),('bottom-type','Straight Pant',30),
  ('bottom-type','Salwar',40),('bottom-type','Sharara',50),('bottom-type','Unstitched',60),

  ('wash-care','Dry clean only',10),
  ('wash-care','Dry clean recommended for the first wash',20),
  ('wash-care','Hand wash cold, separately',30),
  ('wash-care','Hand wash with mild detergent',40),
  ('wash-care','Machine wash gentle, cold water',50),
  ('wash-care','Do not bleach, wring or tumble dry',60)
) as v(attr, value, sort_order)
join attributes a on a.slug = v.attr
on conflict (attribute_id, value) do update set sort_order = excluded.sort_order;

-- ------------------------------------------- which category asks what
-- Attached to the sections, and inherited by their children at read time, so
-- a new subcategory is useful the moment it is created rather than needing
-- its own list ticked.
insert into category_attributes (category_id, attribute_id, sort_order)
select c.id, a.id, v.sort_order
from (values
  ('sarees','fabric',10),('sarees','colour',20),('sarees','weave',30),
  ('sarees','pattern',40),('sarees','occasion',50),('sarees','saree-length',60),
  ('sarees','blouse-piece',70),('sarees','wash-care',80),

  ('churidars','fabric',10),('churidars','colour',20),('churidars','pattern',30),
  ('churidars','occasion',40),('churidars','kurta-length',50),('churidars','sleeve-type',60),
  ('churidars','neck-type',70),('churidars','bottom-type',80),('churidars','dupatta',90),
  ('churidars','wash-care',100)
) as v(cat, attr, sort_order)
join categories c on c.slug = v.cat
join attributes a on a.slug = v.attr
on conflict (category_id, attribute_id) do update set sort_order = excluded.sort_order;

-- ------------------------------------------------------------ backfill
-- The three legacy columns become attribute values, so nothing typed into
-- the old form is lost. `where value is not null` keeps this re-runnable and
-- stops it overwriting anything edited since.
insert into product_attribute_values (product_id, attribute_id, value)
select p.id, a.id, p.fabric
from products p join attributes a on a.slug = 'fabric'
where p.fabric is not null and p.fabric <> ''
on conflict (product_id, attribute_id) do nothing;

insert into product_attribute_values (product_id, attribute_id, value)
select p.id, a.id, p.wash_care
from products p join attributes a on a.slug = 'wash-care'
where p.wash_care is not null and p.wash_care <> ''
on conflict (product_id, attribute_id) do nothing;

-- `length` held text like "6.3 metres (with blouse piece)". It lands on the
-- saree length attribute as written rather than being parsed into a number —
-- guessing at a customer-facing string is how "6.3 metres" becomes "6".
insert into product_attribute_values (product_id, attribute_id, value)
select p.id, a.id, p.length
from products p join attributes a on a.slug = 'saree-length'
where p.length is not null and p.length <> ''
on conflict (product_id, attribute_id) do nothing;

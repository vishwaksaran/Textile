-- =====================================================================
-- Sri Laxmi Silks — seed data (categories + products)
-- Safe to re-run: upserts on the unique slug / name.
-- =====================================================================

insert into categories (name, slug, description, image_url) values
  ('Kanchipuram', 'kanchipuram',
   'Heavy mulberry silk with contrasting korvai borders, woven in the temple town of Kanchipuram.',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw'),
  ('Banarasi', 'banarasi',
   'Opulent zari brocade from Varanasi, with floral jaal and kadhwa motifs.',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw'),
  ('Khadi Cotton', 'khadi-cotton',
   'Handspun, handwoven cotton — the fabric of freedom, prized for its breathability.',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw'),
  ('Wedding', 'wedding',
   'Bridal weaves for the most photographed day of a life — heavy silk, heavier zari.',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDXv4jeKDN8spDfGM01TloiqofMPs23wm_k74AiVX1E0BpYlSFeMFwupA0IXTvE5IAbESeG3jLFy4Hj0p3QJwRGWTVEJYj1gEyRDLea0QADZwoSZXIGgEatDjDLK3iT00n5p0DKTDBG4m2v2c8JCf26x-fMLOu9rZCo8xEvRO17IyLTiFEBsQdDjdWN8HwVTkwAfPhF7-ST_MB1KotLDnFQn_MoGL16vifIzvjiYgZbFXuCJ7-3Q8gQ-A=w2048-rw'),
  ('Heritage', 'heritage',
   'Revival weaves and archival motifs, reproduced with the original loom techniques.',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDN0YOqXyAKk1BWPpTT3ILBvyNw7ewJUW55xetd2pv_th7RcG2r1LTYsJwdYcmu_SOL4VAh5MXlrqcx4ZAcIqkfzdOnIfvRcNRqpvgvOBf7ntw_P_5QJPmm4JVyWqArvWeHo86Le9IafKC0Rp0s5CiMzaSqn30w9qFf5irFkpXdx6F1QhxQycV6K-rsQRnrXdongqy3v6GlRnMbR3FT4Rnoi4bZjnA32PtLMWc_ihC-p1cF-XvTvhVDiw=w2048-rw')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      image_url = excluded.image_url;

-- Products ------------------------------------------------------------------
with c as (select id, slug from categories)
insert into products (name, description, price, discounted_price, stock_quantity, category_id, images, is_sold_out, is_active)
select v.name, v.description, v.price, v.discounted_price, v.stock, c.id, v.images, v.stock <= 0, true
from (values
  ('Royal Emerald Kanjeevaram',
   'A deep emerald body offset by a broad antique-gold korvai border. Pure mulberry silk, woven by a single weaver over eleven days. Comes with an unstitched blouse piece and an authenticity card.',
   28000, 24500, 4, 'kanchipuram',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw']),
  ('Crimson Heirloom Kanjeevaram',
   'The classic bridal red, with a temple-motif border and a rich pallu of paisleys in pure zari. Weight and drape that only Kanchipuram silk achieves.',
   32000, null, 2, 'wedding',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw']),
  ('Midnight Blue Silk Mark Saree',
   'Indigo silk with a silver zari jaal across the body. Understated for a daytime ceremony, quietly luxurious under evening light.',
   28500, null, 6, 'kanchipuram',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw']),
  ('Golden Mustard Tissue Silk',
   'A featherweight tissue silk in turmeric gold. The zari is woven through the warp, so the whole saree catches light rather than only the border.',
   19000, null, 9, 'kanchipuram',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw']),
  ('Maroon Banarasi Kadhwa Brocade',
   'Kadhwa weaving means every motif is woven separately rather than cut — the reverse is as clean as the face. Deep maroon with dense gold buta.',
   46000, 41500, 3, 'banarasi',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw']),
  ('Ivory Banarasi Georgette',
   'Ivory georgette with a scattered silver jaal — the Banarasi vocabulary in a lighter, more fluid drape.',
   24000, null, 7, 'banarasi',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw']),
  ('Peacock Banarasi Katan Silk',
   'Peacock blue katan silk with a meenakari border in rose and green. A wedding-guest saree that photographs beautifully.',
   38000, null, 0, 'banarasi',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw']),
  ('Natural Khadi Cotton Saree',
   'Unbleached, handspun khadi with a slub texture you can feel through the drape. Softens with every wash.',
   4800, 4200, 18, 'khadi-cotton',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw']),
  ('Indigo Block-Print Khadi',
   'Natural-indigo block print on handspun khadi, dyed in small batches. Slight variation between pieces is the point, not a flaw.',
   5600, null, 12, 'khadi-cotton',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw']),
  ('Bridal Red Zari Tissue',
   'A muhurtham saree in bridal red, with a full-width zari pallu. Sold with a matching unstitched blouse.',
   58000, 52000, 2, 'wedding',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw']),
  ('Temple Border Bridal Silk',
   'Gopuram temple borders on both selvedges, with a contrast pallu in mustard. Heirloom weight at 780 grams.',
   64000, null, 1, 'wedding',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw']),
  ('Archival Paithani Revival',
   'Reproduced from a 1940s archive piece — the parrot-and-vine pallu, rewoven on a traditional pit loom.',
   72000, null, 2, 'heritage',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuDN0YOqXyAKk1BWPpTT3ILBvyNw7ewJUW55xetd2pv_th7RcG2r1LTYsJwdYcmu_SOL4VAh5MXlrqcx4ZAcIqkfzdOnIfvRcNRqpvgvOBf7ntw_P_5QJPmm4JVyWqArvWeHo86Le9IafKC0Rp0s5CiMzaSqn30w9qFf5irFkpXdx6F1QhxQycV6K-rsQRnrXdongqy3v6GlRnMbR3FT4Rnoi4bZjnA32PtLMWc_ihC-p1cF-XvTvhVDiw=w2048-rw']),
  ('Handwoven Chanderi Dupatta',
   'Sheer chanderi with a fine gold border. Light enough to fold into a palm, formal enough for a reception.',
   6800, null, 21, 'heritage',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw']),
  ('Gold Tissue Bridal Dupatta',
   'A pure-zari tissue dupatta, woven to be draped over a lehenga or worn as a veil.',
   14500, 12900, 5, 'heritage',
   array['https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw'])
) as v(name, description, price, discounted_price, stock, cat_slug, images)
join c on c.slug = v.cat_slug
where not exists (select 1 from products p where p.name = v.name);

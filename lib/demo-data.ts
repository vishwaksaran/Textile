import type { Category, Product } from '@/types';

/**
 * Fallback catalogue used when Supabase credentials are absent, so the store
 * renders end-to-end on a fresh clone. It mirrors supabase/migrations/0002_seed.sql.
 * Everything downstream treats these as ordinary rows.
 */

const IMG = {
  kanjeevaram:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCSrQf3vxt79ccVZmGRqnsWM6p1-AaCTo_-fIZLWbDutRXU-2E35XqGpqx9g-fhvSwfyYHxIepNej-Dp2VAHi4VjDZWHTnZphX0nhQqSXxYbuTzmbxoE5AaFfPKrxvEjNu0qpk7veLataLi09vLaI4jjBE5u1pVL4xEb4mkYKQJZ53wagP3uvHWgJC3oAHgWjKlbsMaHuTEUP3hFSX5I_94iykWBDZe5ZegJcM5v6jh7Eq6uGnKqdvTNA=w2048-rw',
  banarasi:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCYR7YXcRWH6RR_8eD3t3DtFGPzldUCBK9ykxEFUQJEWLPHswRLGxlNZ_8tqfEDAm9kNFMByIh272ySh51eZglRJAguY7PFP_F43yIbSKiKShv9jqubd3JFg7bYsjW1zZM-nGQNtHT8fSPVB7Py-uV9rwojGjHe8hgZnh_Ypp9Nl3hDemiRXvz3gEbrcTThUTwfhXFGi9Sug1wmiR957wLjH4skp4I4tjWTVa6uV2DMHvsYmE1gEcPdzg=w2048-rw',
  khadi:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAyD374sRA_NnGP-rRlMgyFCCiK1eTnJO7hUPWzyDnVuz6epCHqfBgh5vcaNGXviLf7Xv0ZHjGxQqsT4VWDqYcdM9hKJ59zjNcyf8SD1dJjVEo9NYWyUKQT9r06xg880hHkBrtP2NqgGDmDzkS2tShlGYeGrIaZy1Y16d_NhJdTmaNfBjvhbxFKpjcWZEurNvbOaqKti1JqoLyx9t6zAHygpP14L-ZUUsStwCPVj0WTp6GUEtgi_iVKvQ=w2048-rw',
  weddingHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDXv4jeKDN8spDfGM01TloiqofMPs23wm_k74AiVX1E0BpYlSFeMFwupA0IXTvE5IAbESeG3jLFy4Hj0p3QJwRGWTVEJYj1gEyRDLea0QADZwoSZXIGgEatDjDLK3iT00n5p0DKTDBG4m2v2c8JCf26x-fMLOu9rZCo8xEvRO17IyLTiFEBsQdDjdWN8HwVTkwAfPhF7-ST_MB1KotLDnFQn_MoGL16vifIzvjiYgZbFXuCJ7-3Q8gQ-A=w2048-rw',
  artisan:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDN0YOqXyAKk1BWPpTT3ILBvyNw7ewJUW55xetd2pv_th7RcG2r1LTYsJwdYcmu_SOL4VAh5MXlrqcx4ZAcIqkfzdOnIfvRcNRqpvgvOBf7ntw_P_5QJPmm4JVyWqArvWeHo86Le9IafKC0Rp0s5CiMzaSqn30w9qFf5irFkpXdx6F1QhxQycV6K-rsQRnrXdongqy3v6GlRnMbR3FT4Rnoi4bZjnA32PtLMWc_ihC-p1cF-XvTvhVDiw=w2048-rw',
} as const;

/** Full-bleed hero photography, sized for the carousel. */
export const HERO_SLIDE_IMAGES = {
  banarasi:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDDFvFpG8p2jzxFDmo8U0J9sCYWZWoC6oPreDrD2iuQqunUzmHgm2m3e3PzjANbNqIwizgkdDqIEf-cyKORuoC4EjENSka3FzBNDIYZzrS7_hFUHtBj7VfxMvJLEeVwo4mkCEyaS3XpzAsN2AqBX8XlDbAMwVRiSoVl16vqUQOPygKgl2lvY3SoRdQq1-sYXa9z9EOO2WBOCrHgMBHs3RWAWmHjNe2v1mEwrccyedGV_JvyRRUAgHeSiw=w2048-rw',
  kanjeevaram:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDqz9PtUhFC2RNtrSpfURXTYe8pU9YoE7CTeKx3Q5mrZSCa8rJqRygbyWd4Q_L9z9vxVChDMiOKjUuzAaNCxo9r-NN1xMaCPuF3mLVnxVjlB_vNL5K3oE5uwbH463oSQCs1qX8C81tThAxu0wgsUeHkDMB5qXWZLT_vwdZikpTcvuK49SLCWMD_-WIfwC0EaWSUp09iFQ2d2sURWdJR185a_sSCnb1bqQHXzxyeFs_GkOAR827iHMTZcw=w2048-rw',
  cotton:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCrIUdpZZAsZRsXV3ilwtjDot95zvUpLWJ6h092VlqONHjUiNa1e-f4Y6IDOmaQGWxyKqovGC1IXqxXpVLsAZky7CgAgA5Kb8-p41jusSnhomr_TSLTADLXIKNeIhBN3VS-skNBXwvzUREWCrHM9otqFIr1bXh1-GkU4fY7lSIKsNyaP9IStolXPy9yHuvuHfK68vz4S8_fBw4qUE0_qZmTCBMCIYIYDGT2zRlF1ikuK4TjOBjnpavgsg=w2048-rw',
} as const;

export const ARTISAN_IMAGE = IMG.artisan;

/** Portrait used in the admin sidebar header. */
export const ADMIN_PORTRAIT =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAsbEGf-_rtHuGfMC5TRT-0xsPAYkKNL5ZGC15El6HpYrOwusBRiAXlCOerTPn70TSqJ1PtWRTgCVsYiog7n01pKMVSos1tq_bsvgJkk7XDEqEIQcRefsUK3U4cjcFi2vq5FbvvFotkR5yhrBUr6TzKGgzDwDXwg6KT-5Xdb6TwFlg5Urbt755vtgZV1qPydoh5-g6y5HtGdfh1iMU8D7bYNNngUIuWV01gL0Bg-aUCi_PbytVeS7kH6g=w2048-rw';

const iso = (daysAgo: number) =>
  new Date(Date.UTC(2026, 0, 1) - daysAgo * 86_400_000).toISOString();

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    name: 'Kanchipuram',
    slug: 'kanchipuram',
    description:
      'Heavy mulberry silk with contrasting korvai borders, woven in the temple town of Kanchipuram.',
    image_url: IMG.kanjeevaram,
    parent_id: null,
    nav_group: 'sarees',
    sort_order: 0,
    created_at: iso(120),
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    name: 'Banarasi',
    slug: 'banarasi',
    description: 'Opulent zari brocade from Varanasi, with floral jaal and kadhwa motifs.',
    image_url: IMG.banarasi,
    parent_id: null,
    nav_group: 'sarees',
    sort_order: 0,
    created_at: iso(118),
  },
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    name: 'Khadi Cotton',
    slug: 'khadi-cotton',
    description:
      'Handspun, handwoven cotton — the fabric of freedom, prized for its breathability.',
    image_url: IMG.khadi,
    parent_id: null,
    nav_group: 'sarees',
    sort_order: 0,
    created_at: iso(116),
  },
  {
    id: 'c0000000-0000-4000-8000-000000000004',
    name: 'Wedding',
    slug: 'wedding',
    description:
      'Bridal weaves for the most photographed day of a life — heavy silk, heavier zari.',
    image_url: IMG.weddingHero,
    parent_id: null,
    nav_group: 'sarees',
    sort_order: 0,
    created_at: iso(114),
  },
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    name: 'Heritage',
    slug: 'heritage',
    description:
      'Revival weaves and archival motifs, reproduced with the original loom techniques.',
    image_url: IMG.artisan,
    parent_id: null,
    nav_group: 'sarees',
    sort_order: 0,
    created_at: iso(112),
  },
];

type DemoProductSeed = {
  n: number;
  name: string;
  description: string;
  price: number;
  discounted_price: number | null;
  stock: number;
  category: string;
  image: string;
  age: number;
};

const SEED: DemoProductSeed[] = [
  {
    n: 1,
    name: 'Royal Emerald Kanjeevaram',
    description:
      'A deep emerald body offset by a broad antique-gold korvai border. Pure mulberry silk, woven by a single weaver over eleven days. Comes with an unstitched blouse piece and an authenticity card.',
    price: 28000,
    discounted_price: 24500,
    stock: 4,
    category: 'kanchipuram',
    image: IMG.kanjeevaram,
    age: 3,
  },
  {
    n: 2,
    name: 'Crimson Heirloom Kanjeevaram',
    description:
      'The classic bridal red, with a temple-motif border and a rich pallu of paisleys in pure zari. Weight and drape that only Kanchipuram silk achieves.',
    price: 32000,
    discounted_price: null,
    stock: 2,
    category: 'wedding',
    image: IMG.banarasi,
    age: 5,
  },
  {
    n: 3,
    name: 'Midnight Blue Silk Mark Saree',
    description:
      'Indigo silk with a silver zari jaal across the body. Understated for a daytime ceremony, quietly luxurious under evening light.',
    price: 28500,
    discounted_price: null,
    stock: 6,
    category: 'kanchipuram',
    image: IMG.kanjeevaram,
    age: 2,
  },
  {
    n: 4,
    name: 'Golden Mustard Tissue Silk',
    description:
      'A featherweight tissue silk in turmeric gold. The zari is woven through the warp, so the whole saree catches light rather than only the border.',
    price: 19000,
    discounted_price: null,
    stock: 9,
    category: 'kanchipuram',
    image: IMG.banarasi,
    age: 8,
  },
  {
    n: 5,
    name: 'Maroon Banarasi Kadhwa Brocade',
    description:
      'Kadhwa weaving means every motif is woven separately rather than cut — the reverse is as clean as the face. Deep maroon with dense gold buta.',
    price: 46000,
    discounted_price: 41500,
    stock: 3,
    category: 'banarasi',
    image: IMG.banarasi,
    age: 11,
  },
  {
    n: 6,
    name: 'Ivory Banarasi Georgette',
    description:
      'Ivory georgette with a scattered silver jaal — the Banarasi vocabulary in a lighter, more fluid drape.',
    price: 24000,
    discounted_price: null,
    stock: 7,
    category: 'banarasi',
    image: IMG.khadi,
    age: 14,
  },
  {
    n: 7,
    name: 'Peacock Banarasi Katan Silk',
    description:
      'Peacock blue katan silk with a meenakari border in rose and green. A wedding-guest saree that photographs beautifully.',
    price: 38000,
    discounted_price: null,
    stock: 0,
    category: 'banarasi',
    image: IMG.kanjeevaram,
    age: 17,
  },
  {
    n: 8,
    name: 'Natural Khadi Cotton Saree',
    description:
      'Unbleached, handspun khadi with a slub texture you can feel through the drape. Softens with every wash.',
    price: 4800,
    discounted_price: 4200,
    stock: 18,
    category: 'khadi-cotton',
    image: IMG.khadi,
    age: 1,
  },
  {
    n: 9,
    name: 'Indigo Block-Print Khadi',
    description:
      'Natural-indigo block print on handspun khadi, dyed in small batches. Slight variation between pieces is the point, not a flaw.',
    price: 5600,
    discounted_price: null,
    stock: 12,
    category: 'khadi-cotton',
    image: IMG.khadi,
    age: 6,
  },
  {
    n: 10,
    name: 'Bridal Red Zari Tissue',
    description:
      'A muhurtham saree in bridal red, with a full-width zari pallu. Sold with a matching unstitched blouse.',
    price: 58000,
    discounted_price: 52000,
    stock: 2,
    category: 'wedding',
    image: IMG.banarasi,
    age: 9,
  },
  {
    n: 11,
    name: 'Temple Border Bridal Silk',
    description:
      'Gopuram temple borders on both selvedges, with a contrast pallu in mustard. Heirloom weight at 780 grams.',
    price: 64000,
    discounted_price: null,
    stock: 1,
    category: 'wedding',
    image: IMG.kanjeevaram,
    age: 21,
  },
  {
    n: 12,
    name: 'Archival Paithani Revival',
    description:
      'Reproduced from a 1940s archive piece — the parrot-and-vine pallu, rewoven on a traditional pit loom.',
    price: 72000,
    discounted_price: null,
    stock: 2,
    category: 'heritage',
    image: IMG.artisan,
    age: 24,
  },
  {
    n: 13,
    name: 'Handwoven Chanderi Dupatta',
    description:
      'Sheer chanderi with a fine gold border. Light enough to fold into a palm, formal enough for a reception.',
    price: 6800,
    discounted_price: null,
    stock: 21,
    category: 'heritage',
    image: IMG.khadi,
    age: 4,
  },
  {
    n: 14,
    name: 'Gold Tissue Bridal Dupatta',
    description:
      'A pure-zari tissue dupatta, woven to be draped over a lehenga or worn as a veil.',
    price: 14500,
    discounted_price: 12900,
    stock: 5,
    category: 'heritage',
    image: IMG.banarasi,
    age: 7,
  },
];

export const DEMO_PRODUCTS: Product[] = SEED.map((s) => {
  const category = DEMO_CATEGORIES.find((c) => c.slug === s.category)!;
  return {
    id: `p0000000-0000-4000-8000-${String(s.n).padStart(12, '0')}`,
    name: s.name,
    description: s.description,
    price: s.price,
    discounted_price: s.discounted_price,
    stock_quantity: s.stock,
    category_id: category.id,
    images: [s.image],
    // Demo catalogue carries no HSN: the breakdown falls back to the
    // shop-wide default until real codes are entered in the admin screen.
    hsn_code: null,
    gst_rate: null,
    is_sold_out: s.stock <= 0,
    is_active: true,
    created_at: iso(s.age),
    updated_at: iso(s.age),
    categories: { id: category.id, name: category.name, slug: category.slug },
  };
});

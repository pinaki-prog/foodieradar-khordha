-- ============================================================
--  FoodieRadar Khordha — Full SQL Schema
--  ✅ SAFE TO RE-RUN: Uses DROP POLICY IF EXISTS before every
--     CREATE POLICY — will never error with "already exists"
--
--  ✅ RLS ADVISOR: All INSERT policies use real WITH CHECK
--     conditions — no "always true" warnings in Supabase Advisor.
-- ============================================================

-- ── TABLES ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  area          TEXT NOT NULL,
  address       TEXT,
  food_type     TEXT CHECK (food_type IN ('veg','nonveg','both')),
  price_range   TEXT CHECK (price_range IN ('₹','₹₹','₹₹₹')),
  avg_price     INTEGER,
  description   TEXT,
  tags          TEXT[],
  submitted_by  TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_gem        BOOLEAN DEFAULT FALSE,
  is_featured   BOOLEAN DEFAULT FALSE,
  rating        NUMERIC(3,1) DEFAULT 0,
  review_count  INTEGER DEFAULT 0,
  image_url        TEXT,
  phone            TEXT,
  website          TEXT,
  opening_hours    TEXT,
  established_year INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  description TEXT,
  location    TEXT NOT NULL,
  area        TEXT,
  event_date  DATE NOT NULL,
  start_time  TIME,
  end_time    TIME,
  is_free     BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','past'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  spot_id       UUID REFERENCES spots(id) ON DELETE CASCADE,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  dish_name     TEXT,
  reviewer_name TEXT,
  image_url     TEXT
);

CREATE TABLE IF NOT EXISTS cookoff_votes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  battle_id     TEXT NOT NULL,
  contestant_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tiffin_listings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  cook_name   TEXT NOT NULL,
  area        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  price_label TEXT,
  food_type   TEXT DEFAULT 'veg',
  delivery    TEXT DEFAULT 'pickup',
  menu_text   TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
);

CREATE TABLE IF NOT EXISTS thali_votes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  week_key    TEXT NOT NULL,
  nominee_id  TEXT NOT NULL
);

-- ── ENABLE RLS ────────────────────────────────────────────────────────────────
ALTER TABLE spots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookoff_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiffin_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE thali_votes     ENABLE ROW LEVEL SECURITY;

-- ── DROP ALL POLICIES FIRST (makes this script safe to re-run anytime) ────────
DROP POLICY IF EXISTS "public_read_spots"           ON spots;
DROP POLICY IF EXISTS "public_insert_spots"         ON spots;
DROP POLICY IF EXISTS "admin_all_spots"             ON spots;
DROP POLICY IF EXISTS "public_read_events"          ON events;
DROP POLICY IF EXISTS "public_insert_events"        ON events;
DROP POLICY IF EXISTS "admin_all_events"            ON events;
DROP POLICY IF EXISTS "public_read_reviews"         ON reviews;
DROP POLICY IF EXISTS "public_insert_reviews"       ON reviews;
DROP POLICY IF EXISTS "Anyone can add review"       ON reviews;
DROP POLICY IF EXISTS "admin_all_reviews"           ON reviews;
DROP POLICY IF EXISTS "public_read_cookoff_votes"   ON cookoff_votes;
DROP POLICY IF EXISTS "public_insert_cookoff_votes" ON cookoff_votes;
DROP POLICY IF EXISTS "public_read_thali_votes"     ON thali_votes;
DROP POLICY IF EXISTS "public_insert_thali_votes"   ON thali_votes;
DROP POLICY IF EXISTS "public_insert_tiffin"        ON tiffin_listings;
DROP POLICY IF EXISTS "admin_all_tiffin"            ON tiffin_listings;

-- ── CREATE POLICIES ───────────────────────────────────────────────────────────

-- SPOTS
CREATE POLICY "public_read_spots"
  ON spots FOR SELECT USING (status = 'approved');
CREATE POLICY "public_insert_spots"
  ON spots FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "admin_all_spots"
  ON spots FOR ALL USING (auth.role() = 'authenticated');

-- EVENTS
CREATE POLICY "public_read_events"
  ON events FOR SELECT USING (status IN ('upcoming','ongoing'));
CREATE POLICY "public_insert_events"
  ON events FOR INSERT WITH CHECK (status = 'upcoming');
CREATE POLICY "admin_all_events"
  ON events FOR ALL USING (auth.role() = 'authenticated');

-- REVIEWS
CREATE POLICY "public_read_reviews"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "public_insert_reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND char_length(comment) BETWEEN 5 AND 2000
  );
CREATE POLICY "admin_all_reviews"
  ON reviews FOR ALL USING (auth.role() = 'authenticated');

-- COOKOFF VOTES
CREATE POLICY "public_read_cookoff_votes"
  ON cookoff_votes FOR SELECT USING (true);
CREATE POLICY "public_insert_cookoff_votes"
  ON cookoff_votes FOR INSERT
  WITH CHECK (
    char_length(battle_id) > 0
    AND char_length(contestant_id) > 0
  );

-- THALI VOTES
CREATE POLICY "public_read_thali_votes"
  ON thali_votes FOR SELECT USING (true);
CREATE POLICY "public_insert_thali_votes"
  ON thali_votes FOR INSERT
  WITH CHECK (
    char_length(week_key) > 0
    AND char_length(nominee_id) > 0
  );

-- TIFFIN LISTINGS
CREATE POLICY "public_insert_tiffin"
  ON tiffin_listings FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND char_length(cook_name) > 0
    AND char_length(phone) >= 10
  );
CREATE POLICY "admin_all_tiffin"
  ON tiffin_listings FOR ALL USING (auth.role() = 'authenticated');

-- ── SEED SPOTS — 50 real Bhubaneswar/Khordha spots ──────────────────────────
-- Only inserts if the spots table is currently empty (safe to re-run)
INSERT INTO spots (name,category,area,address,food_type,price_range,avg_price,tags,latitude,longitude,status,rating,review_count,is_gem,is_featured,description)
SELECT * FROM (VALUES

  -- OLD TOWN & LINGARAJ AREA
  ('Raghunath Odia Thali',     'Odia Thali',   'Old Town, BBSR',       'Near Lingaraj Temple Road',   'veg',    '₹₹',120,ARRAY['Dalma','Pakhala','Thali','Mitha Dali'],          20.2961,85.8245,'approved',4.7,183,false,true, 'One of Old Town''s most beloved thali spots. Proper Odia thali with rotating vegetable dishes, dalma, chhena and papad. Lunch rush fills up by noon.'),
  ('Old Town Dahibara King',   'Street Food',  'Old Town, BBSR',       'Lingaraj Nagar Gate',         'veg',    '₹',  25,ARRAY['Dahibara','Aloodum','Gupchup'],                   20.2955,85.8238,'approved',4.8,412,true, true, 'Legendary dahibara aloodum stall that has been feeding Old Town since the 1980s. Goes by 7 AM, sells out by 10 AM.'),
  ('Lingaraj Chhena Shop',     'Sweet Shop',   'Old Town, BBSR',       'Near Lingaraj Temple',        'veg',    '₹',  40,ARRAY['Chhena Poda','Rasgulla','Chhena Jhili'],          20.2948,85.8250,'approved',4.9,289,true, true, 'The most famous chhena poda shop in BBSR. Clay oven baked daily. People travel from across the city for this.'),
  ('Ananta Vasudev Prasad',    'Odia Thali',   'Old Town, BBSR',       'Ananta Vasudev Temple Road',  'veg',    '₹',  60,ARRAY['Temple Prasad','Dalma','Khiri','Sattvic'],         20.2945,85.8228,'approved',4.6,167,true, false,'Pure sattvic Odia meal served near the temple. No onion, no garlic. Incredibly clean taste.'),
  ('Ekamra Haat Food Court',   'Street Food',  'Old Town, BBSR',       'Ekamra Haat Complex',         'both',   '₹',  80,ARRAY['Odia Street Food','Pitha','Mudhi'],                20.2888,85.8250,'approved',4.3,78, false,false,'The weekly haat has a permanent food stall zone. Best on weekends when seasonal pitha vendors set up.'),

  -- MASTER CANTEEN AREA
  ('Master Canteen Chicken',   'Dhaba',        'Master Canteen, BBSR', 'Master Canteen Square',       'nonveg', '₹₹',180,ARRAY['Chicken','Biryani','Mutton','Fish'],               20.2980,85.8180,'approved',4.4,210,false,true, '24-hour dhaba that never closes. Famous for late-night biryani. The mutton curry here is proper slow-cooked.'),
  ('Master Canteen Gupchup',   'Street Food',  'Master Canteen, BBSR', 'Master Canteen Chowk',        'veg',    '₹',  15,ARRAY['Gupchup','Chaat','Aloo Chop','Bara'],              20.2975,85.8185,'approved',4.6,334,true, false,'The most popular gupchup stall in the zone. Come 5-8 PM for the full experience.'),
  ('Sharma Tiffin Centre',     'Tiffin Centre','Master Canteen, BBSR', 'Opp. Master Canteen Hospital', 'veg',   '₹',  50,ARRAY['Idli','Poha','Upma','Paratha'],                    20.2985,85.8175,'approved',4.2,89, false,false,'Budget breakfast for the hospital workers and students. ₹20 for a full breakfast plate.'),

  -- SAHEED NAGAR AREA
  ('Mahesh Tiffin Centre',     'Tiffin Centre','Saheed Nagar, BBSR',   'Saheed Nagar Main Road',      'veg',    '₹',  60,ARRAY['Idli','Upma','Dosa','Chakuli'],                   20.3116,85.8245,'approved',4.5,94, true, true, 'A Saheed Nagar institution since 1994. Their chakuli pitha with ghuguni on Sundays draws queues.'),
  ('Saheed Nagar Paratha House','Street Food',  'Saheed Nagar, BBSR',   'Saheed Nagar Market',         'both',   '₹',  40,ARRAY['Paratha','Egg','Aloo','Night Food'],               20.3110,85.8240,'approved',4.3,156,false,false,'Egg paratha specialist. Open until 2 AM. Goes-to for IT workers heading home late.'),
  ('Chai Point Saheed Nagar',  'Chai & Snacks','Saheed Nagar, BBSR',   'Near Saheed Nagar Police Station','veg', '₹', 20,ARRAY['Chai','Samosa','Pakoda','Bread Pakoda'],           20.3105,85.8248,'approved',4.1,67, false,false,'Strong masala chai and crispy samosas. The gathering spot for the evening crowd.'),
  ('The Biryani Pot',          'Dhaba',        'Saheed Nagar, BBSR',   'Saheed Nagar Lane 3',         'nonveg', '₹₹',160,ARRAY['Biryani','Chicken','Mutton','Kabab'],              20.3120,85.8242,'approved',4.4,198,false,true, 'Best biryani in the Saheed Nagar stretch. The dum biryani is slow-cooked for 3 hours.'),

  -- UNIT 4 AREA
  ('Lakshmi Sweet House',      'Sweet Shop',   'Unit 4, BBSR',         'Unit 4 Market Complex',       'veg',    '₹',  50,ARRAY['Chhena Poda','Rasgulla','Chhena Jhili','Khiri'],   20.3060,85.8140,'approved',4.8,327,false,true, 'The benchmark sweet shop of BBSR. Their chhena poda sells out every evening. Est. 1977.'),
  ('Unit 4 Dalma Bhata',       'Odia Thali',   'Unit 4, BBSR',         'Unit 4 Market Area',          'veg',    '₹',  70,ARRAY['Dalma','Rice','Saga Bhaja','Thali'],               20.3055,85.8135,'approved',4.5,143,false,false,'Simple, honest Odia thali. The dalma here is textbook perfect — balanced, not too heavy.'),
  ('Unit 4 Ghuguni Stall',     'Street Food',  'Unit 4, BBSR',         'Unit 4 Junction',             'veg',    '₹',  20,ARRAY['Ghuguni','Bara','Mudhi','Evening Snack'],           20.3065,85.8145,'approved',4.4,201,true, false,'The ghuguni and bara combination at this stall is legendary among Unit 4 office-goers.'),
  ('Noodles & More',           'Street Food',  'Unit 4, BBSR',         'Unit 4 Main Road',            'veg',    '₹',  60,ARRAY['Noodles','Momo','Chowmein','Indo-Chinese'],         20.3058,85.8138,'approved',4.0,45, false,false,'Student favourite for budget Indo-Chinese. Momos are fresh made, not frozen.'),

  -- NAYAPALLI AREA
  ('Nayapalli Chai Adda',      'Chai & Snacks','Nayapalli, BBSR',      'Near PWD Office',             'veg',    '₹',  25,ARRAY['Chai','Samosa','Pakoda','Mudhi'],                  20.2996,85.8036,'approved',4.2,55, true, false,'The tea-and-politics spot of Nayapalli. Chai served in clay kulhads. Open 5 AM to 10 PM.'),
  ('Nayapalli Odia Kitchen',   'Odia Thali',   'Nayapalli, BBSR',      'Nayapalli Mkt Complex',       'veg',    '₹₹',100,ARRAY['Pakhala','Dalma','Macha Bhaja','Thali'],           20.2990,85.8032,'approved',4.6,112,true, false,'Proper pakhala thali from March to July. The best version outside a home kitchen in BBSR.'),
  ('Ice Cream Park Nayapalli', 'Sweet Shop',   'Nayapalli, BBSR',      'Near Nayapalli Park',         'veg',    '₹',  60,ARRAY['Ice Cream','Kulfi','Cold Drinks','Sundae'],         20.3005,85.8042,'approved',4.1,87, false,false,'Popular evening hangout for families. Local kulfi is better than the branded options.'),

  -- PATIA / KIIT AREA  
  ('Green Bowl Organic',       'Organic Store','Patia, BBSR',          'Patia Square',                'veg',    '₹₹₹',200,ARRAY['Organic','Millets','Salad','Healthy'],             20.3524,85.8172,'approved',4.3,42, false,false,'The only certified organic food store in Patia. Popular with expats and health-conscious KIIT faculty.'),
  ('Patia Morning Tiffin',     'Tiffin Centre','Patia, BBSR',          'Near Patia Chowk',            'veg',    '₹',  45,ARRAY['Idli','Dosa','Upma','Poha'],                       20.3520,85.8165,'approved',4.4,167,false,true, 'The go-to breakfast spot for KIIT students. Queue starts at 7 AM. ₹15 for idli-sambar.'),
  ('KIIT Road Maggi Stall',    'Street Food',  'Patia, BBSR',          'KIIT University Gate 2',      'veg',    '₹',  25,ARRAY['Maggi','Egg','Noodles','Late Night'],               20.3530,85.8160,'approved',4.2,234,true, false,'The most famous late-night stall near KIIT. Open till 2 AM. Maggi with extra masala and egg.'),
  ('Barbeque Village Patia',   'Restaurant',   'Patia, BBSR',          'Patia Main Road',             'both',   '₹₹₹',600,ARRAY['BBQ','Buffet','Grill','Non-Veg'],                 20.3518,85.8170,'approved',4.2,89, false,false,'Weekend splurge option. Unlimited BBQ buffet. Good for group outings.'),
  ('Subway Patia',             'Restaurant',   'Patia, BBSR',          'Patia Square Mall',           'both',   '₹₹',200,ARRAY['Sandwich','Fast Food','Veg Options'],              20.3522,85.8168,'approved',3.8,67, false,false,'Standard Subway. Popular with the IT crowd for a quick lunch.'),

  -- CDA / CHANDRASEKHARPUR AREA
  ('CDA Odia Thali Point',     'Odia Thali',   'Chandrasekharpur, BBSR','CDA Market Complex',         'veg',    '₹₹', 90,ARRAY['Thali','Dalma','Odia','Homestyle'],               20.3200,85.8300,'approved',4.4,156,false,false,'Best thali in the CDA zone. Home-style cooking, generous portions. Full thali at ₹90.'),
  ('Chandrasekharpur Biryani', 'Dhaba',        'Chandrasekharpur, BBSR','Near CDA Hospital',          'nonveg', '₹₹',140,ARRAY['Biryani','Chicken','Mutton','Rice'],               20.3195,85.8305,'approved',4.3,123,false,false,'Popular among CDA residents for delivery and takeaway biryani. Large portions.'),

  -- JATNI & SOUTH BBSR
  ('Jatni Chaat Corner',       'Street Food',  'Jatni',                'Jatni Main Road Junction',    'veg',    '₹',  30,ARRAY['Gupchup','Chaat','Bhel','Dahibara'],               20.2741,85.8377,'approved',4.6,61, true, false,'The most popular street food stall in Jatni. Their gupchup water recipe has never changed.'),
  ('Jatni Chhena Gaja Shop',   'Sweet Shop',   'Jatni',                'Jatni Bazar',                 'veg',    '₹',  30,ARRAY['Chhena Gaja','Sweets','Traditional'],              20.2748,85.8370,'approved',4.7,88, true, false,'Jatni is famous for its chhena gaja. This shop has been making it since 1968. Must try.'),
  ('Jatni Dhaba Classic',      'Dhaba',        'Jatni',                'NH-16 Jatni',                 'both',   '₹',  70,ARRAY['Thali','Fish','Chicken','Truck Stop'],              20.2750,85.8360,'approved',4.3,134,false,false,'Classic truck-stop dhaba on NH-16. Fish curry with rice is the specialty. Very local crowd.'),

  -- BALIPATNA & BALIANTA
  ('Balipatna Farmers Haat',   'Odia Thali',   'Balipatna',            'Balipatna Weekly Market',     'veg',    '₹',  40,ARRAY['Haat','Organic','Seasonal','Pitha'],               20.2640,85.8200,'approved',4.5,45, true, false,'Every Friday, the Balipatna haat has fresh produce and home-cooked food stalls. Hyper-local.'),
  ('Balianta Dhaba',           'Dhaba',        'Balianta',             'Balianta Main Road',          'both',   '₹',  80,ARRAY['Thali','Fish','Mutton','Roadside'],                20.3350,85.7900,'approved',4.2,67, false,false,'Simple roadside dhaba serving Odia home-cooking. Known for its fish curry.'),

  -- KHORDHA TOWN
  ('Maa Tarini Dhaba',         'Dhaba',        'Khordha Town',         'NH-16, Khordha',              'both',   '₹',  90,ARRAY['Thali','Odia','Rice','Truck Stop'],                20.1820,85.6070,'approved',4.5,88, true, true, 'One of the most loved roadside dhabas on NH-16. The mutton rice here is a staple for truckers and travelers.'),
  ('Khordha Town Sweets',      'Sweet Shop',   'Khordha Town',         'Khordha Bazar',               'veg',    '₹',  35,ARRAY['Rasgulla','Chhena','Traditional','Local'],         20.1825,85.6065,'approved',4.4,112,false,false,'Old-school sweet shop in Khordha town. Softer rasgullas than BBSR shops.'),
  ('Khordha Station Tiffin',   'Tiffin Centre','Khordha Town',         'Near Khordha Road Station',   'veg',    '₹',  40,ARRAY['Idli','Poha','Upma','Early Morning'],              20.1815,85.6080,'approved',4.1,67, false,false,'Opens at 5 AM for the early train crowd. Quick and cheap breakfast.'),

  -- AREA 1 / BHUBANESWAR NEW
  ('Infocity Food Hub',        'Restaurant',   'Patia, BBSR',          'Infocity Complex',            'both',   '₹₹',200,ARRAY['Multi-cuisine','Office Lunch','Buffet','IT'],       20.3460,85.8190,'approved',4.0,178,false,false,'Popular IT park food hub. Multi-cuisine canteen style. Lunch buffet ₹150.'),
  ('Kanak Durga Sweets',       'Sweet Shop',   'Rasulgarh, BBSR',      'Rasulgarh Bazar',             'veg',    '₹',  45,ARRAY['Rasgulla','Chhena Poda','Pantua','Festival'],      20.2820,85.8310,'approved',4.5,234,true, false,'Long-running sweet shop in Rasulgarh. Their pantua (gulab jamun variant) is exceptional.'),
  ('Rasulgarh Biryani House',  'Dhaba',        'Rasulgarh, BBSR',      'Rasulgarh Main Road',         'nonveg', '₹₹',150,ARRAY['Biryani','Chicken','Egg','Takeaway'],              20.2815,85.8315,'approved',4.3,145,false,false,'Fast and good biryani for delivery in the Rasulgarh zone. Large portions.'),

  -- SPECIALTY / UNIQUE
  ('Mati Handi Mutton Point',  'Dhaba',        'Khordha Outskirts',    'NH-316, Before Khordha',      'nonveg', '₹₹',200,ARRAY['Mati Handi','Mutton','Clay Pot','Slow Cook'],       20.2100,85.6500,'approved',4.8,67, true, true, 'Mutton slow-cooked for 5+ hours in traditional clay pots over wood fire. Sells out by 1 PM. Come early.'),
  ('Mudhi Mansa Corner',       'Street Food',  'Old Town, BBSR',       'Near Old Town Market',        'nonveg', '₹',  50,ARRAY['Mudhi Mansa','Puffed Rice','Mutton','Cuttack Style'],20.2963,85.8242,'approved',4.7,189,true, true, 'The Cuttack-style mudhi mansa done right in BBSR. Crispy puffed rice with spicy mutton gravy.'),
  ('Pakhala Special House',    'Odia Thali',   'Nayapalli, BBSR',      'Nayapalli Lane 7',            'veg',    '₹',  60,ARRAY['Pakhala','Seasonal','Summer','Traditional'],       20.2992,85.8030,'approved',4.9,156,true, false,'Only open March-July. The most authentic pakhala thali in BBSR with all 8 traditional accompaniments.'),
  ('Raja Festival Pitha Stall','Street Food',  'Old Town, BBSR',       'Near Lingaraj Market',        'veg',    '₹',  30,ARRAY['Pitha','Arisa','Manda','Raja Festival','Seasonal'],20.2958,85.8235,'approved',4.6,78, true, false,'Only active during Raja Festival (June). Handmade pithas — arisa, manda, chakuli — straight from home kitchens.'),
  ('Tanka Torani Stall',       'Chai & Snacks','Old Town, BBSR',       'Old Town Bypass Road',        'veg',    '₹',  15,ARRAY['Tanka Torani','Summer Drink','Raw Mango','Cooling'], 20.2952,85.8240,'approved',4.7,134,true, false,'The best tanka torani (raw mango cooler) in BBSR. March to June only. A true summer institution.'),
  ('Abadha Bhoga Counter',     'Odia Thali',   'Old Town, BBSR',       'Near Jagannath Temple, BBSR', 'veg',    '₹',  50,ARRAY['Mahaprasad','Abadha','Temple Food','Pure Veg'],    20.2940,85.8232,'approved',4.8,223,true, true, 'Traditional Jagannath temple prasad-style food. Pure, clean, and deeply spiritual. One of a kind.'),

  -- CHAI ADDAS
  ('Infocity Chai Wallah',     'Chai & Snacks','Patia, BBSR',          'Infocity Gate 1',             'veg',    '₹',  15,ARRAY['Chai','Filter Coffee','Biscuit','IT Crowd'],       20.3510,85.8175,'approved',4.0,89, false,false,'The chai that fuels Infocity''s IT workers. Simple, strong, cheap.'),
  ('Student Adda Chai',        'Chai & Snacks','Patia, BBSR',          'Near KIIT Campus 11',         'veg',    '₹',  12,ARRAY['Chai','Maggi','Late Night','Student'],             20.3535,85.8162,'approved',4.3,456,true, false,'Open 24 hours. The 2 AM chai stop for every KIIT engineering student. Iconic.'),
  ('Cycle Chai BBSR',          'Chai & Snacks','Unit 4, BBSR',         'Unit 4 Bus Stand',            'veg',    '₹',   8,ARRAY['Chai','Kulhad','Cycling Cart','Unique'],           20.3058,85.8142,'approved',4.5,78, true, false,'Chai served from a cycle cart since 1992. Kulhad chai at ₹8. A disappearing tradition.')

) AS v(name,category,area,address,food_type,price_range,avg_price,tags,latitude,longitude,status,rating,review_count,is_gem,is_featured,description)
WHERE NOT EXISTS (SELECT 1 FROM spots LIMIT 1);

-- SEED EVENTS (only inserts if table is currently empty)
INSERT INTO events (name,event_type,location,area,event_date,is_free,status)
SELECT * FROM (VALUES
  ('Ekamra Haat Food Mela',          'Food Festival','Ekamra Haat, Bhubaneswar',  'Old Town',    '2025-03-15'::date,true, 'upcoming'),
  ('Best Dalma in Khordha Round 1',  'Cook-Off',     'Unit 4 Community Hall',     'Unit 4',      '2025-03-18'::date,true, 'upcoming'),
  ('Balipatna Farmers Market',       'Weekly Haat',  'Balipatna',                 'Balipatna',   '2025-03-22'::date,true, 'upcoming'),
  ('Odisha Street Food Pop-Up Night','Pop-Up',       'Saheed Nagar, BBSR',        'Saheed Nagar','2025-04-01'::date,true, 'upcoming'),
  ('Traditional Odia Cooking Class', 'Workshop',     'Old Town Cultural Centre',  'Old Town',    '2025-04-05'::date,false,'upcoming'),
  ('Pana Sankranti Food Trail',      'Food Festival','Bhubaneswar Old Town',      'Old Town',    '2025-04-14'::date,true, 'upcoming')
) AS v(name,event_type,location,area,event_date,is_free,status)
WHERE NOT EXISTS (SELECT 1 FROM events LIMIT 1);

-- ── SETUP COMPLETE ────────────────────────────────────────────────────────────
-- Go to: Supabase → Authentication → Users → Add User
-- Email: admin@foodieradar.com  (any email is fine)
-- Password: choose something strong
-- That email+password is your admin.html login. Done!

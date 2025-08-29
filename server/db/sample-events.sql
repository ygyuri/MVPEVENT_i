-- Sample Events for Event-i
-- Web3-ready events with rich data

-- Insert sample events
INSERT INTO events (
    organizer_id,
    title,
    slug,
    description,
    short_description,
    category_id,
    venue_name,
    address,
    city,
    state,
    country,
    start_date,
    end_date,
    capacity,
    price,
    is_free,
    is_featured,
    is_trending,
    status,
    cover_image_url
) VALUES
-- Tech Events
(1, 'Tech Conference 2024', 'tech-conference-2024', 
 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations. Learn about AI, Web3, and the future of technology.',
 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations.',
 (SELECT id FROM event_categories WHERE slug = 'technology'),
 'San Francisco Convention Center',
 '123 Tech Street, San Francisco, CA 94105',
 'San Francisco', 'CA', 'USA',
 '2024-03-15 09:00:00', '2024-03-15 18:00:00',
 1000, 299.00, false, true, true, 'published',
 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop'),

(1, 'Web3 Summit', 'web3-summit-2024',
 'Explore the future of decentralized technology. Meet blockchain pioneers, learn about DeFi, NFTs, and the metaverse.',
 'Explore the future of decentralized technology with blockchain pioneers.',
 (SELECT id FROM event_categories WHERE slug = 'technology'),
 'Crypto Arena',
 '456 Blockchain Blvd, San Francisco, CA 94105',
 'San Francisco', 'CA', 'USA',
 '2024-04-20 10:00:00', '2024-04-22 18:00:00',
 500, 199.00, false, true, true, 'published',
 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop'),

-- Business Events
(1, 'Startup Meetup', 'startup-meetup-2024',
 'Network with fellow entrepreneurs and share insights about building successful startups. Perfect for founders and investors.',
 'Network with fellow entrepreneurs and share insights about building successful startups.',
 (SELECT id FROM event_categories WHERE slug = 'business'),
 'New York Business Center',
 '789 Startup Ave, New York, NY 10001',
 'New York', 'NY', 'USA',
 '2024-02-28 18:00:00', '2024-02-28 21:00:00',
 500, 149.00, false, true, false, 'published',
 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop'),

(1, 'Business Summit', 'business-summit-2024',
 'Connect with business leaders and discover new opportunities for growth. Keynotes, workshops, and networking sessions.',
 'Connect with business leaders and discover new opportunities for growth.',
 (SELECT id FROM event_categories WHERE slug = 'business'),
 'Chicago Business Center',
 '321 Commerce St, Chicago, IL 60601',
 'Chicago', 'IL', 'USA',
 '2024-05-05 08:00:00', '2024-05-05 17:00:00',
 800, 199.00, false, false, false, 'published',
 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop'),

-- Music Events
(1, 'Music Festival', 'music-festival-2024',
 'A three-day celebration of music featuring top artists from around the world. Rock, pop, electronic, and more!',
 'A three-day celebration of music featuring top artists from around the world.',
 (SELECT id FROM event_categories WHERE slug = 'music'),
 'Los Angeles Music Arena',
 '654 Festival Way, Los Angeles, CA 90001',
 'Los Angeles', 'CA', 'USA',
 '2024-06-20 14:00:00', '2024-06-22 23:00:00',
 5000, 199.00, false, true, true, 'published',
 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop'),

(1, 'Jazz Night', 'jazz-night-2024',
 'An intimate evening of smooth jazz featuring local and international artists. Perfect for a romantic night out.',
 'An intimate evening of smooth jazz featuring local and international artists.',
 (SELECT id FROM event_categories WHERE slug = 'music'),
 'Blue Note Jazz Club',
 '987 Jazz Lane, New York, NY 10001',
 'New York', 'NY', 'USA',
 '2024-03-10 20:00:00', '2024-03-10 23:00:00',
 200, 89.00, false, false, false, 'published',
 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=600&fit=crop'),

-- Arts & Culture Events
(1, 'Design Workshop', 'design-workshop-2024',
 'Learn the latest design trends and techniques from expert designers. Hands-on workshops and portfolio reviews.',
 'Learn the latest design trends and techniques from expert designers.',
 (SELECT id FROM event_categories WHERE slug = 'arts-culture'),
 'Austin Creative Hub',
 '147 Design St, Austin, TX 73301',
 'Austin', 'TX', 'USA',
 '2024-04-10 10:00:00', '2024-04-10 16:00:00',
 200, 79.00, false, false, false, 'published',
 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop'),

(1, 'Art Exhibition', 'art-exhibition-2024',
 'Contemporary art exhibition featuring emerging artists. Wine and cheese reception included.',
 'Contemporary art exhibition featuring emerging artists.',
 (SELECT id FROM event_categories WHERE slug = 'arts-culture'),
 'Modern Art Gallery',
 '258 Art Ave, Miami, FL 33101',
 'Miami', 'FL', 'USA',
 '2024-03-25 18:00:00', '2024-03-25 22:00:00',
 300, 45.00, false, false, false, 'published',
 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop'),

-- Sports Events
(1, 'Fitness Bootcamp', 'fitness-bootcamp-2024',
 'High-intensity fitness bootcamp for all levels. Get in shape with professional trainers.',
 'High-intensity fitness bootcamp for all levels.',
 (SELECT id FROM event_categories WHERE slug = 'sports'),
 'Downtown Fitness Center',
 '369 Fitness Blvd, Los Angeles, CA 90001',
 'Los Angeles', 'CA', 'USA',
 '2024-04-15 07:00:00', '2024-04-15 09:00:00',
 100, 25.00, false, false, false, 'published',
 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'),

-- Food & Drink Events
(1, 'Wine Tasting', 'wine-tasting-2024',
 'Exclusive wine tasting event featuring premium wines from around the world. Expert sommeliers will guide you through each tasting.',
 'Exclusive wine tasting event featuring premium wines from around the world.',
 (SELECT id FROM event_categories WHERE slug = 'food-drink'),
 'Vintage Wine Cellar',
 '741 Wine St, Napa, CA 94558',
 'Napa', 'CA', 'USA',
 '2024-05-12 16:00:00', '2024-05-12 20:00:00',
 150, 120.00, false, true, false, 'published',
 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop'),

-- Education Events
(1, 'AI Workshop', 'ai-workshop-2024',
 'Learn the fundamentals of artificial intelligence and machine learning. Hands-on coding sessions included.',
 'Learn the fundamentals of artificial intelligence and machine learning.',
 (SELECT id FROM event_categories WHERE slug = 'education'),
 'Tech Learning Center',
 '852 AI Blvd, San Francisco, CA 94105',
 'San Francisco', 'CA', 'USA',
 '2024-04-08 09:00:00', '2024-04-08 17:00:00',
 300, 299.00, false, true, true, 'published',
 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop'),

-- Health & Wellness Events
(1, 'Yoga Retreat', 'yoga-retreat-2024',
 'Weekend yoga retreat in the mountains. Meditation, healthy food, and peaceful surroundings.',
 'Weekend yoga retreat in the mountains with meditation and healthy food.',
 (SELECT id FROM event_categories WHERE slug = 'health-wellness'),
 'Mountain Wellness Center',
 '963 Wellness Way, Boulder, CO 80301',
 'Boulder', 'CO', 'USA',
 '2024-06-15 08:00:00', '2024-06-17 18:00:00',
 50, 450.00, false, true, false, 'published',
 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop');

-- Add tags to events
INSERT INTO event_tags_relation (event_id, tag_id) VALUES
-- Tech Conference
(1, (SELECT id FROM event_tags WHERE slug = 'ai')),
(1, (SELECT id FROM event_tags WHERE slug = 'networking')),
-- Web3 Summit
(2, (SELECT id FROM event_tags WHERE slug = 'web3')),
(2, (SELECT id FROM event_tags WHERE slug = 'blockchain')),
-- Startup Meetup
(3, (SELECT id FROM event_tags WHERE slug = 'startup')),
(3, (SELECT id FROM event_tags WHERE slug = 'networking')),
-- Music Festival
(5, (SELECT id FROM event_tags WHERE slug = 'live-music')),
-- Jazz Night
(6, (SELECT id FROM event_tags WHERE slug = 'jazz')),
-- Design Workshop
(7, (SELECT id FROM event_tags WHERE slug = 'art-exhibition')),
-- Art Exhibition
(8, (SELECT id FROM event_tags WHERE slug = 'art-exhibition')),
-- Fitness Bootcamp
(9, (SELECT id FROM event_tags WHERE slug = 'fitness')),
-- Wine Tasting
(10, (SELECT id FROM event_tags WHERE slug = 'wine')),
-- AI Workshop
(11, (SELECT id FROM event_tags WHERE slug = 'ai')),
-- Yoga Retreat
(12, (SELECT id FROM event_tags WHERE slug = 'yoga')),
(12, (SELECT id FROM event_tags WHERE slug = 'meditation')); 
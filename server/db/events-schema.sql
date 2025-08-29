-- Enhanced Events Schema for Event-i
-- Web3-ready with advanced search and discovery features

-- Event categories
CREATE TABLE IF NOT EXISTS event_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event tags for better discovery
CREATE TABLE IF NOT EXISTS event_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(300),
    category_id INTEGER REFERENCES event_categories(id),
    location VARCHAR(255),
    venue_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    capacity INTEGER,
    current_attendees INTEGER DEFAULT 0,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    is_free BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    cover_image_url TEXT,
    gallery_urls TEXT[], -- Array of image URLs
    ticket_types JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event tags relationship
CREATE TABLE IF NOT EXISTS event_tags_relation (
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES event_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- Event attendees
CREATE TABLE IF NOT EXISTS event_attendees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ticket_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    attended BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- Event favorites
CREATE TABLE IF NOT EXISTS event_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(city, state, country);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, start_date);
CREATE INDEX IF NOT EXISTS idx_events_trending ON events(is_trending, start_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, start_date);

-- Full-text search function
CREATE OR REPLACE FUNCTION update_events_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.venue_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector updates
CREATE TRIGGER events_search_vector_update
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_search_vector();

-- Insert sample categories
INSERT INTO event_categories (name, slug, description, icon, color) VALUES
    ('Technology', 'technology', 'Tech conferences, hackathons, and innovation events', 'laptop', '#3B82F6'),
    ('Music', 'music', 'Concerts, festivals, and live performances', 'music', '#8B5CF6'),
    ('Business', 'business', 'Networking, conferences, and business meetups', 'briefcase', '#10B981'),
    ('Sports', 'sports', 'Sports events, tournaments, and fitness activities', 'trophy', '#F59E0B'),
    ('Arts & Culture', 'arts-culture', 'Art exhibitions, theater, and cultural events', 'palette', '#EF4444'),
    ('Food & Drink', 'food-drink', 'Food festivals, wine tastings, and culinary events', 'utensils', '#F97316'),
    ('Education', 'education', 'Workshops, seminars, and learning events', 'graduation-cap', '#06B6D4'),
    ('Health & Wellness', 'health-wellness', 'Yoga, meditation, and wellness retreats', 'heart', '#EC4899')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample tags
INSERT INTO event_tags (name, slug) VALUES
    ('Web3', 'web3'),
    ('AI', 'ai'),
    ('Blockchain', 'blockchain'),
    ('Startup', 'startup'),
    ('Networking', 'networking'),
    ('Live Music', 'live-music'),
    ('DJ', 'dj'),
    ('Rock', 'rock'),
    ('Jazz', 'jazz'),
    ('Classical', 'classical'),
    ('Fitness', 'fitness'),
    ('Yoga', 'yoga'),
    ('Meditation', 'meditation'),
    ('Cooking', 'cooking'),
    ('Wine', 'wine'),
    ('Beer', 'beer'),
    ('Art Exhibition', 'art-exhibition'),
    ('Theater', 'theater'),
    ('Dance', 'dance'),
    ('Photography', 'photography')
ON CONFLICT (slug) DO NOTHING;

-- Update existing events with enhanced data
UPDATE events SET 
    category_id = (SELECT id FROM event_categories WHERE slug = 'technology' LIMIT 1),
    venue_name = 'San Francisco Convention Center',
    city = 'San Francisco',
    state = 'CA',
    country = 'USA',
    is_featured = true,
    is_trending = true,
    status = 'published',
    capacity = 1000,
    price = 299.00,
    short_description = 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations.'
WHERE title = 'Tech Conference 2024';

UPDATE events SET 
    category_id = (SELECT id FROM event_categories WHERE slug = 'business' LIMIT 1),
    venue_name = 'New York Business Center',
    city = 'New York',
    state = 'NY',
    country = 'USA',
    is_featured = true,
    status = 'published',
    capacity = 500,
    price = 149.00,
    short_description = 'Network with fellow entrepreneurs and share insights about building successful startups.'
WHERE title = 'Startup Meetup';

UPDATE events SET 
    category_id = (SELECT id FROM event_categories WHERE slug = 'arts-culture' LIMIT 1),
    venue_name = 'Austin Creative Hub',
    city = 'Austin',
    state = 'TX',
    country = 'USA',
    status = 'published',
    capacity = 200,
    price = 79.00,
    short_description = 'Learn the latest design trends and techniques from expert designers.'
WHERE title = 'Design Workshop';

UPDATE events SET 
    category_id = (SELECT id FROM event_categories WHERE slug = 'music' LIMIT 1),
    venue_name = 'Los Angeles Music Arena',
    city = 'Los Angeles',
    state = 'CA',
    country = 'USA',
    is_featured = true,
    is_trending = true,
    status = 'published',
    capacity = 5000,
    price = 199.00,
    short_description = 'A three-day celebration of music featuring top artists from around the world.'
WHERE title = 'Music Festival';

UPDATE events SET 
    category_id = (SELECT id FROM event_categories WHERE slug = 'business' LIMIT 1),
    venue_name = 'Chicago Business Center',
    city = 'Chicago',
    state = 'IL',
    country = 'USA',
    status = 'published',
    capacity = 800,
    price = 199.00,
    short_description = 'Connect with business leaders and discover new opportunities for growth.'
WHERE title = 'Business Summit'; 
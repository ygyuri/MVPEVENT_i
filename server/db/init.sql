-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Insert sample events
INSERT INTO events (title, description, date, location) VALUES
    ('Tech Conference 2024', 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations.', '2024-03-15', 'San Francisco, CA'),
    ('Startup Meetup', 'Network with fellow entrepreneurs and share insights about building successful startups.', '2024-02-28', 'New York, NY'),
    ('Design Workshop', 'Learn the latest design trends and techniques from expert designers.', '2024-04-10', 'Austin, TX'),
    ('Music Festival', 'A three-day celebration of music featuring top artists from around the world.', '2024-06-20', 'Los Angeles, CA'),
    ('Business Summit', 'Connect with business leaders and discover new opportunities for growth.', '2024-05-05', 'Chicago, IL')
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 
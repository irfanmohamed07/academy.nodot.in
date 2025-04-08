-- 1. Drop existing tables if any (for fresh setup)
-- DROP TABLE IF EXISTS video_progress, purchases, modules, sections, courses;

-- 2. Courses Table
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  price INT,
  full_content TEXT,
  language TEXT,
  instructor TEXT,
  duration TEXT,
  videos_count TEXT
);

-- 3. Sections Table
CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

-- 4. Modules Table
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  section_id INT REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  duration TEXT  -- optional, like "12:34"
);

-- 5. Purchases Table
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Video Progress Table (Optional - for completion tracking)
CREATE TABLE video_progress (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  module_id INT REFERENCES modules(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT FALSE
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),  -- Store the reset token
    reset_token_expiration TIMESTAMP,  -- Store the expiration time for the reset token
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
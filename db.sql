-- 1. Drop existing tables if any (for fresh setup)
-- DROP TABLE IF EXISTS video_progress, purchases, modules, sections, courses;

-- 2. Courses Table
CREATE TABLE courses (
  
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    price INTEGER,
    full_content TEXT,
    language TEXT,
    instructor TEXT,
    duration TEXT,
    vedio_duration TEXT
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
    
);

CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  price_offer NUMERIC(10, 2) NOT NULL
);

CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
	certificate_code TEXT UNIQUE NOT NULL;
	user_id INT
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);







CREATE TABLE payment_history (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,  -- 'success' or 'failure'
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.admin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(250) NOT NULL,
    reset_token VARCHAR(250),
    reset_token_expiration BIGINT
);

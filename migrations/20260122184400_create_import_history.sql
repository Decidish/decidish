CREATE TABLE import_logs (
    id SERIAL PRIMARY KEY,
    -- user_id UUID,                -- who inserted it 
    type VARCHAR(50) NOT NULL,    -- 'url' or 'file'
    identifier VARCHAR(2048),     -- URL string or filename
    status VARCHAR(50) NOT NULL,  -- 'success', 'failed'
    recipe_name VARCHAR(255),     
    job_id INT,                   -- Link to the internal job_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);
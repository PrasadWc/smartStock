const db = require('./db');

// SQL queries to create tables if they don't exist
const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_number VARCHAR(255) NOT NULL UNIQUE,
        barcode VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category_id INT,
        part_number VARCHAR(255),
        price DECIMAL(10, 2) DEFAULT 0,
        stock_quantity INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 10,
        special_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        type ENUM('IN', 'OUT') NOT NULL,
        quantity INT NOT NULL,
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`;

// Split and execute each CREATE TABLE statement
const initializeDatabase = async () => {
    try {
        const statements = createTablesSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            await db.query(statement);
        }

        console.log('✅ Database tables initialized successfully!');

        // Insert default user if doesn't exist
        try {
            const [users] = await db.query('SELECT * FROM users WHERE id = 1');
            if (users.length === 0) {
                await db.query(
                    'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
                    [1, 'admin', 'admin@scanstock.local', 'default_password']
                );
                console.log('✅ Default user created (ID: 1)');
            }
        } catch (error) {
            console.error('Error creating default user:', error.message);
        }

    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        throw error;
    }
};

module.exports = initializeDatabase;

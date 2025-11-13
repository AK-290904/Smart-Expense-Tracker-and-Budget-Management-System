-- MySQL Database Setup Script for Expense Tracker
-- Run this script in MySQL Workbench or MySQL command line

-- Create the database
CREATE DATABASE IF NOT EXISTS expense_tracker 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create user (change 'your_secure_password' to your actual password)
CREATE USER IF NOT EXISTS 'expense_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant all privileges on the expense_tracker database
GRANT ALL PRIVILEGES ON expense_tracker.* TO 'expense_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify the database was created
SHOW DATABASES LIKE 'expense_tracker';

-- Verify user privileges
SHOW GRANTS FOR 'expense_user'@'localhost';

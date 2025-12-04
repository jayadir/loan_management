CREATE DATABASE IF NOT EXISTS loan_system_db;
USE loan_system_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    term_weeks INT NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 5.00,
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    remaining_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    document_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Track per-loan document uploads with types and review status
CREATE TABLE IF NOT EXISTS loan_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    doc_type ENUM('kyc','income_proof','bank_statement','disbursement_proof') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    status ENUM('uploaded','approved','rejected') DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    UNIQUE KEY unique_loan_doctype (loan_id, doc_type)
);

-- Audit trail for status changes
CREATE TABLE IF NOT EXISTS loan_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    old_status ENUM('pending','approved','rejected','paid') NULL,
    new_status ENUM('pending','approved','rejected','paid') NOT NULL,
    changed_by INT NULL,
    note VARCHAR(255) NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);


-- Migration: Add loans.interest_rate (if missing), ensure repayment_schedule exists,
-- and make loan_status_history.changed_by nullable for ON DELETE SET NULL.

-- Switch to database (no variables used)
USE loan_system_db;

-- Add loans.interest_rate if missing (TiDB/MySQL 8 syntax)
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 5.00 AFTER term_weeks;

-- Make loan_status_history.changed_by NULL-able (idempotent)
ALTER TABLE loan_status_history
  MODIFY COLUMN changed_by INT NULL;

-- Create repayment_schedule if not exists
CREATE TABLE IF NOT EXISTS repayment_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    emi DECIMAL(10,2) NOT NULL,
    principal DECIMAL(10,2) NOT NULL,
    interest DECIMAL(10,2) NOT NULL,
    remaining DECIMAL(10,2) NOT NULL,
    status ENUM('upcoming','paid','overdue') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_loan_installment (loan_id, installment_no)
);

-- Optional: Ensure users.interest_rate exists
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 5.00 AFTER password_hash;

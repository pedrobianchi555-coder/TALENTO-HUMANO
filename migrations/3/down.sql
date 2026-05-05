
-- Remove indexes
DROP INDEX IF EXISTS idx_loan_repayment_plans_loan_id;
DROP INDEX IF EXISTS idx_loan_payments_installment_id;
DROP INDEX IF EXISTS idx_loan_payments_loan_id;
DROP INDEX IF EXISTS idx_loan_installments_status;
DROP INDEX IF EXISTS idx_loan_installments_loan_id;
DROP INDEX IF EXISTS idx_loans_status;
DROP INDEX IF EXISTS idx_loans_user_id;

-- Drop tables in reverse order
DROP TABLE IF EXISTS loan_repayment_plans;
DROP TABLE IF EXISTS loan_payments;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;

-- Add test departments
INSERT INTO departments (department_name, department_type, is_active, created_by)
VALUES 
('Information and Communication Technology (ICT)', 'Academic', TRUE, 1),
('Tourism and Hospitality Management (THM)', 'Academic', TRUE, 1),
('Business Administration and Accountancy', 'Academic', TRUE, 1),
('Student Council', 'Organization', TRUE, 1),
('Computer Society', 'Organization', TRUE, 1);

-- View existing departments
SELECT * FROM departments; 
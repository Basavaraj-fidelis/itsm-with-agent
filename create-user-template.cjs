
const XLSX = require('xlsx');

// Sample user data
const userData = [
  {
    email: 'john.doe@company.com',
    first_name: 'John',
    last_name: 'Doe',
    department: 'IT Support',
    role: 'technician',
    phone: '+1-555-0123',
    job_title: 'Senior Technician',
    location: 'New York',
    password: 'TempPass123!'
  },
  {
    email: 'jane.smith@company.com',
    first_name: 'Jane',
    last_name: 'Smith',
    department: 'Engineering',
    role: 'end_user',
    phone: '+1-555-0124',
    job_title: 'Software Developer',
    location: 'Boston',
    password: 'TempPass456!'
  },
  {
    email: 'mike.johnson@company.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    department: 'HR',
    role: 'manager',
    phone: '+1-555-0125',
    job_title: 'HR Manager',
    location: 'Chicago',
    password: 'TempPass789!'
  },
  {
    email: 'sarah.wilson@company.com',
    first_name: 'Sarah',
    last_name: 'Wilson',
    department: 'Finance',
    role: 'end_user',
    phone: '+1-555-0126',
    job_title: 'Financial Analyst',
    location: 'Miami',
    password: 'TempPass101!'
  },
  {
    email: 'admin.user@company.com',
    first_name: 'Admin',
    last_name: 'User',
    department: 'IT Management',
    role: 'admin',
    phone: '+1-555-0127',
    job_title: 'System Administrator',
    location: 'New York',
    password: 'AdminPass999!'
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(userData);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, 'Users');

// Write the file
XLSX.writeFile(wb, 'user-import-template.xlsx');

console.log('Excel template created: user-import-template.xlsx');

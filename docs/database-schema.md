# Database Schema (Google Sheets)

## Users Sheet
```
- ID
- Name
- Email
- Role (Admin/Project Manager/Designer)
- Password
- Created At
```

## Projects Sheet
```
- Project ID
- Title
- Start Date
- End Date
- Project Type (Fixed/Dedicated)
- Total Hours (for Fixed Cost projects)
- Consumed Hours
- Designer ID (Foreign Key to Users)
- Project Manager ID (Foreign Key to Users)
- Basecamp Link
- Status (Active/Completed)
- Created At
- Updated At
```

## Team Members Sheet
```
- Member ID
- Name
- Role
- Status (Available/Assigned)
- Current Project ID (Foreign Key to Projects)
- Skills
- Created At
- Updated At
```

## Sheet Relationships
1. Projects -> Users (Designer ID)
2. Projects -> Users (Project Manager ID)
3. Team Members -> Projects (Current Project ID)

## Sample Data Format
### Projects Sheet Example:
| Project ID | Title | Start Date | End Date | Project Type | Total Hours | Consumed Hours | Designer ID | Project Manager ID | Basecamp Link | Status | Created At | Updated At |
|------------|-------|------------|----------|--------------|-------------|----------------|-------------|-------------------|---------------|---------|------------|------------|
| PRJ001 | Website Redesign | 2024-01-01 | 2024-03-31 | Fixed | 100 | 45 | USR002 | USR003 | https://basecamp.com/... | Active | 2024-01-01 | 2024-01-15 |
| PRJ002 | App Development | 2024-02-01 | 2024-12-31 | Dedicated | null | 320 | USR004 | USR003 | https://basecamp.com/... | Active | 2024-02-01 | 2024-02-15 |
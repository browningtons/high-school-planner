# Single CSV Template

This version is intentionally denormalized so admins can work in one sheet.

## Files
- school_planner_template.csv
- data_dictionary.csv

## How to use
1. Open one file in Excel or Google Sheets.
2. Edit school-wide defaults in the top rows and fill changes down.
3. Edit course/pathway rows as needed.
4. Keep `course_code` and `pathway_code` stable when possible.
5. Save as CSV UTF-8 and send one file.

## Notes
- Each row is a pathway-course placement.
- The same course may appear on multiple rows if used in multiple pathways.
- `placement=required` rows are scheduled roadmap classes.
- `placement=recommended_elective` rows are optional.

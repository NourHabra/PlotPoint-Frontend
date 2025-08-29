# Template System Documentation

## Overview

The template system allows administrators to create dynamic report templates with sections, static text, and variables. This system is designed to generate reports by replacing variables with actual data.

## Features

- **Template Creation**: Build templates with multiple sections
- **Content Blocks**: Mix static text and dynamic variables
- **Variable Types**: Support for string, number, date, and currency variables
- **Real-time Preview**: See how templates will look with sample data
- **Template Management**: List, edit, duplicate, and delete templates
- **Validation**: Built-in validation for template structure

## Template Structure

### Template
```typescript
interface Template {
  id: string;
  name: string;
  description?: string;
  sections: TemplateSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  category?: string;
  tags?: string[];
}
```

### Section
```typescript
interface TemplateSection {
  id: string;
  title: string;
  content: ContentBlock[];
  order: number;
}
```

### Content Block
```typescript
interface ContentBlock {
  id: string;
  type: 'text' | 'variable';
  content: string;
  variableName?: string;
  variableType?: 'string' | 'number' | 'date' | 'currency';
  isRequired?: boolean;
  placeholder?: string;
}
```

## Usage Examples

### Example Template: Property Valuation Report

**Template Name**: Property Valuation Report

**Sections**:
1. **Property Information**
   - Text: "The property located in "
   - Variable: `[VARIABLE]` (property_location, string, required)
   - Text: " with an area of "
   - Variable: `[VARIABLE]` (area_size, number, required)
   - Text: " square feet."

2. **Valuation Details**
   - Text: "Based on our assessment, the estimated value is "
   - Variable: `$[VARIABLE]` (estimated_value, currency, required)
   - Text: " as of "
   - Variable: `[VARIABLE]` (valuation_date, date, required)

### Generated Report Example

With sample data:
```json
{
  "property_location": "123 Main Street, Downtown",
  "area_size": "2,500",
  "estimated_value": "450,000",
  "valuation_date": "2024-01-15"
}
```

The generated report would be:
```
The property located in 123 Main Street, Downtown with an area of 2,500 square feet.

Based on our assessment, the estimated value is $450,000 as of 2024-01-15.
```

## Variable Types

### String
- **Usage**: General text input
- **Example**: Property location, client name
- **Validation**: Optional min/max length

### Number
- **Usage**: Numeric values
- **Example**: Area size, quantity
- **Validation**: Optional min/max values

### Date
- **Usage**: Date values
- **Example**: Valuation date, contract date
- **Format**: ISO date string (YYYY-MM-DD)

### Currency
- **Usage**: Monetary values
- **Example**: Estimated value, price
- **Format**: Numeric value (formatted with currency symbol)

## Frontend Implementation

### Key Components

1. **TemplateBuilder** (`/dashboard/templates/create`)
   - Main template creation interface
   - Manages template metadata and sections

2. **SectionEditor**
   - Edits individual sections
   - Manages content blocks within sections

3. **ContentBlockEditor**
   - Edits text and variable blocks
   - Configures variable properties

4. **TemplatePreview**
   - Shows template preview with sample data
   - Real-time preview as you build

### Navigation

The template system is accessible through:
- **Create Template**: `/dashboard/templates/create`
- **Manage Templates**: `/dashboard/templates`

## Backend Integration

### API Endpoints (To be implemented)

```typescript
// Template CRUD operations
GET    /api/templates           // List all templates
POST   /api/templates           // Create new template
GET    /api/templates/:id       // Get template by ID
PUT    /api/templates/:id       // Update template
DELETE /api/templates/:id       // Delete template

// Template generation
POST   /api/templates/:id/generate  // Generate report from template
POST   /api/templates/:id/preview   // Preview template with data
```

### Database Schema (Suggested)

```sql
-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template sections table
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content blocks table
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES template_sections(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'variable')),
  content TEXT NOT NULL,
  variable_name VARCHAR(100),
  variable_type VARCHAR(20),
  is_required BOOLEAN DEFAULT false,
  placeholder TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Utility Functions

The system includes utility functions in `src/lib/template-utils.ts`:

- `extractVariables()`: Extract all variables from a template
- `validateTemplate()`: Validate template structure
- `generateTemplatePreview()`: Generate preview with sample data
- `createSampleData()`: Create sample data for preview
- `exportTemplate()`: Export template as JSON
- `importTemplate()`: Import template from JSON

## Future Enhancements

1. **Template Categories**: Organize templates by category
2. **Template Versioning**: Track template changes over time
3. **Template Sharing**: Share templates between users
4. **Advanced Variables**: Support for conditional logic and calculations
5. **Template Analytics**: Track template usage and performance
6. **Bulk Operations**: Import/export multiple templates
7. **Template Approval Workflow**: Review and approve templates
8. **Integration with Report Generation**: Connect to actual report generation system

## Security Considerations

1. **Input Validation**: All template content should be validated
2. **Access Control**: Ensure only authorized users can create/edit templates
3. **Data Sanitization**: Sanitize user inputs to prevent XSS
4. **Rate Limiting**: Limit template creation/editing operations
5. **Audit Logging**: Log all template modifications

## Performance Considerations

1. **Caching**: Cache frequently used templates
2. **Lazy Loading**: Load template content on demand
3. **Optimization**: Optimize template rendering for large templates
4. **Database Indexing**: Proper indexing for template queries 
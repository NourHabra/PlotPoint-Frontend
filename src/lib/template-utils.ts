import { Template, TemplateSection, ContentBlock, VariableDefinition, KMLFieldDefinition } from "@/types/template";
import { getKMLFieldType } from "./kml-constants";

/**
 * Extract all variable definitions from a template
 */
export function extractVariables(template: Template): VariableDefinition[] {
  const variables: VariableDefinition[] = [];
  const seenVariables = new Set<string>();

  template.sections.forEach(section => {
    section.content.forEach(block => {
      if (block.type === 'variable' && block.variableName && !seenVariables.has(block.variableName)) {
        variables.push({
          name: block.variableName,
          type: block.variableType || 'string',
          defaultValue: undefined,
        });
        seenVariables.add(block.variableName);
      }
    });
  });

  return variables;
}

/**
 * Extract all KML field definitions from a template
 */
export function extractKMLFields(template: Template): KMLFieldDefinition[] {
  const kmlFields: KMLFieldDefinition[] = [];
  const seenFields = new Set<string>();

  template.sections.forEach(section => {
    section.content.forEach(block => {
      if (block.type === 'kml_variable' && block.kmlField && !seenFields.has(block.kmlField)) {
        kmlFields.push({
          name: block.kmlField,
          type: getKMLFieldType(block.kmlField),
          kmlField: block.kmlField,
        });
        seenFields.add(block.kmlField);
      }
    });
  });

  return kmlFields;
}

/**
 * Validate template structure
 */
export function validateTemplate(template: Template): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.name.trim()) {
    errors.push("Template name is required");
  }

  if (template.sections.length === 0) {
    errors.push("Template must have at least one section");
  }

  template.sections.forEach((section, sectionIndex) => {
    if (!section.title.trim()) {
      errors.push(`Section ${sectionIndex + 1} must have a title`);
    }

    if (section.content.length === 0) {
      errors.push(`Section "${section.title}" must have at least one content block`);
    }

    section.content.forEach((block, blockIndex) => {
      if (block.type === 'text' && !block.content.trim()) {
        errors.push(`Text block ${blockIndex + 1} in section "${section.title}" cannot be empty`);
      }

      if (block.type === 'variable') {
        if (!block.variableName?.trim()) {
          errors.push(`Variable block ${blockIndex + 1} in section "${section.title}" must have a variable name`);
        }
        if (!block.content.includes(`{{${block.variableName}}}`)) {
          errors.push(`Variable block ${blockIndex + 1} in section "${section.title}" must contain {{${block.variableName}}} placeholder`);
        }
      }

      if (block.type === 'kml_variable') {
        if (!block.kmlField) {
          errors.push(`KML block ${blockIndex + 1} in section "${section.title}" must have a KML field selected`);
        }
        if (!block.content.includes(`{{${block.kmlField}}}`)) {
          errors.push(`KML block ${blockIndex + 1} in section "${section.title}" must contain {{${block.kmlField}}} placeholder`);
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a preview of the template with sample data
 */
export function generateTemplatePreview(
  template: Template,
  sampleData: Record<string, any> = {}
): string {
  let preview = `# ${template.name}\n\n`;
  
  if (template.description) {
    preview += `${template.description}\n\n`;
  }

  template.sections.forEach(section => {
    preview += `## ${section.title}\n\n`;
    
    let sectionContent = '';
    section.content.forEach(block => {
      if (block.type === 'text') {
        sectionContent += block.content;
      } else if (block.type === 'variable') {
        const variableName = block.variableName;
        if (variableName) {
          const sampleValue = sampleData[variableName] ?? `{{${variableName}}}`;
          const blockContent = block.content.replace(new RegExp(`{{${variableName}}}`, 'g'), String(sampleValue));
          sectionContent += blockContent;
        } else {
          sectionContent += block.content;
        }
      } else if (block.type === 'kml_variable') {
        const kmlField = block.kmlField;
        if (kmlField) {
          const sampleValue = sampleData[kmlField] ?? `{{${kmlField}}}`;
          const blockContent = block.content.replace(new RegExp(`{{${kmlField}}}`, 'g'), String(sampleValue));
          sectionContent += blockContent;
        } else {
          sectionContent += block.content;
        }
      }
    });
    
    preview += `${sectionContent}\n\n`;
  });

  return preview;
}

/**
 * Parse template content and extract variable placeholders
 */
export function parseTemplateContent(content: string): {
  textParts: string[];
  variableParts: string[];
} {
  const textParts: string[] = [];
  const variableParts: string[] = [];
  
  // Split by {{variable_name}} placeholder
  const parts = content.split(/(\{\{[^}]+\}\})/);
  
  parts.forEach((part, index) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      variableParts.push(part);
    } else if (part.trim()) {
      textParts.push(part);
    }
  });

  return { textParts, variableParts };
}

/**
 * Create a sample data object for template preview
 */
export function createSampleData(template: Template): Record<string, any> {
  const variables = extractVariables(template);
  const kmlFields = extractKMLFields(template);
  const sampleData: Record<string, any> = {};

  // Add regular variables
  variables.forEach(variable => {
    switch (variable.type) {
      case 'string':
        sampleData[variable.name] = `Sample ${variable.name.replace(/_/g, ' ')}`;
        break;
      case 'number':
        sampleData[variable.name] = Math.floor(Math.random() * 1000) + 1;
        break;
      case 'date':
        sampleData[variable.name] = new Date().toLocaleDateString();
        break;
      case 'currency':
        sampleData[variable.name] = `$${(Math.random() * 100000).toFixed(2)}`;
        break;
      default:
        sampleData[variable.name] = `{{${variable.name}}}`;
    }
  });

  // Add KML fields
  kmlFields.forEach(field => {
    switch (field.type) {
      case 'string':
        sampleData[field.name] = `Sample ${field.name.replace(/_/g, ' ')}`;
        break;
      case 'number':
        sampleData[field.name] = Math.floor(Math.random() * 1000) + 1;
        break;
      case 'date':
        sampleData[field.name] = new Date().toLocaleDateString();
        break;
      case 'currency':
        sampleData[field.name] = `$${(Math.random() * 100000).toFixed(2)}`;
        break;
      default:
        sampleData[field.name] = `{{${field.name}}}`;
    }
  });

  return sampleData;
}

/**
 * Export template as JSON
 */
export function exportTemplate(template: Template): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Import template from JSON
 */
export function importTemplate(jsonString: string): Template | null {
  try {
    const template = JSON.parse(jsonString);
    
    // Validate the imported template
    const validation = validateTemplate(template);
    if (!validation.isValid) {
      console.error('Invalid template structure:', validation.errors);
      return null;
    }

    return template;
  } catch (error) {
    console.error('Failed to parse template JSON:', error);
    return null;
  }
}

/**
 * Get template statistics
 */
export function getTemplateStats(template: Template): {
  totalSections: number;
  totalTextBlocks: number;
  totalVariables: number;
  totalKMLFields: number;
  totalCharacters: number;
} {
  let totalTextBlocks = 0;
  let totalVariables = 0;
  let totalKMLFields = 0;
  let totalCharacters = 0;

  template.sections.forEach(section => {
    section.content.forEach(block => {
      if (block.type === 'text') {
        totalTextBlocks++;
        totalCharacters += block.content.length;
      } else if (block.type === 'variable') {
        totalVariables++;
      } else if (block.type === 'kml_variable') {
        totalKMLFields++;
      }
    });
  });

  return {
    totalSections: template.sections.length,
    totalTextBlocks,
    totalVariables,
    totalKMLFields,
    totalCharacters,
  };
} 
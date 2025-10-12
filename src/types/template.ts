export type KMLFieldType =
  | 'municipality'
  | 'plot_number'
  | 'plot_area'
  | 'coordinates'
  | 'sheet_plan'
  | 'registration_number'
  | 'property_type'
  | 'zone'
  | 'zone_description'
  | 'building_coefficient'
  | 'coverage'
  | 'floors'
  | 'height'
  | 'value_2018'
  | 'value_2021';

export interface ContentBlock {
  id: string;
  type: 'text' | 'variable' | 'kml_variable';
  content: string;
  variableName?: string;
  variableType?: 'string' | 'number' | 'date' | 'currency';
  kmlField?: KMLFieldType;
  textTemplates?: string[];
  groupId?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  content: ContentBlock[];
  order: number;
}

export type ImportedFieldType = 'text' | 'kml' | 'image' | 'select' | 'date' | 'calculated';

export interface ImportedVariable {
  id: string;
  name: string;
  type: ImportedFieldType;
  kmlField?: KMLFieldType;
  options?: string[];
  expression?: string;
  description?: string;
  sourceText?: string;
  isRequired?: boolean;
  textTemplates?: string[];
  groupId?: string;
  // Image-specific metadata for imported Word templates
  imageTarget?: string; // e.g., word/media/image3.png
  imageExtent?: { cx: number; cy: number }; // EMUs
}

export interface Template {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  sections: TemplateSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  // Word import support
  sourceDocxPath?: string;
  previewPdfPath?: string;
  variables?: ImportedVariable[];
  variableGroups?: VariableGroup[];
  // Whether filling this template requires a KML upload stage
  requiresKml?: boolean;
}

// TemplateFormData removed: category no longer supported

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface KMLFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  kmlField: KMLFieldType;
}

export interface VariableGroup {
  id: string;
  name: string;
  description?: string;
  order?: number;
}
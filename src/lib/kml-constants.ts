import { KMLFieldType } from "@/types/template";

export const KML_FIELD_OPTIONS: Array<{
  value: KMLFieldType;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency';
}> = [
  { value: 'municipality', label: 'Municipality', type: 'string' },
  { value: 'region', label: 'Region', type: 'string' },
  { value: 'part', label: 'Part', type: 'string' },
  { value: 'plot_number', label: 'Plot Number', type: 'string' },
  { value: 'plot_area', label: 'Plot Area', type: 'number' },
  { value: 'coordinates', label: 'Coordinates', type: 'string' },
  { value: 'sheet', label: 'Sheet', type: 'string' },
  { value: 'plan', label: 'Plan', type: 'string' },
  { value: 'sheet_plan', label: 'Sheet/Plan', type: 'string' },
  { value: 'registration_number', label: 'Registration Number', type: 'string' },
  { value: 'property_type', label: 'Property Type', type: 'string' },
  { value: 'zone', label: 'Zone', type: 'string' },
  { value: 'zone_description', label: 'Zone Description', type: 'string' },
  { value: 'building_coefficient', label: 'Building Coefficient', type: 'number' },
  { value: 'coverage', label: 'Coverage', type: 'number' },
  { value: 'floors', label: 'Floors', type: 'number' },
  { value: 'height', label: 'Height', type: 'number' },
  { value: 'value_2018', label: 'Value 2018', type: 'currency' },
  { value: 'value_2021', label: 'Value 2021', type: 'currency' },
];

export function getKMLFieldLabel(value: KMLFieldType): string {
  const field = KML_FIELD_OPTIONS.find(option => option.value === value);
  return field ? field.label : value;
}

export function getKMLFieldType(value: KMLFieldType): 'string' | 'number' | 'date' | 'currency' {
  const field = KML_FIELD_OPTIONS.find(option => option.value === value);
  return field ? field.type : 'string';
}
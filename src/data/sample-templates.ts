import { Template } from "@/types/template";

export const sampleTemplates: Template[] = [
  {
    id: "1",
    name: "Property Valuation Report",
    description: "Standard template for property valuation reports with location, area, and estimated value.",
    
    sections: [
      {
        id: "section-1",
        title: "Property Information",
        order: 0,
        content: [
          {
            id: "block-1",
            type: "text",
            content: "The property located in ",
          },
          {
            id: "block-2",
            type: "variable",
            content: "{{property_location}}",
            variableName: "property_location",
            variableType: "string",
          },
          {
            id: "block-3",
            type: "text",
            content: " with an area of ",
          },
          {
            id: "block-4",
            type: "variable",
            content: "{{area_size}}",
            variableName: "area_size",
            variableType: "number",
          },
          {
            id: "block-5",
            type: "text",
            content: " square feet.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Valuation Details",
        order: 1,
        content: [
          {
            id: "block-6",
            type: "text",
            content: "Based on our assessment, the estimated value is ",
          },
          {
            id: "block-7",
            type: "variable",
            content: "${{estimated_value}}",
            variableName: "estimated_value",
            variableType: "currency",
          },
          {
            id: "block-8",
            type: "text",
            content: " as of ",
          },
          {
            id: "block-9",
            type: "variable",
            content: "{{valuation_date}}",
            variableName: "valuation_date",
            variableType: "date",
          },
          {
            id: "block-10",
            type: "text",
            content: ".",
          },
        ],
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "admin",
    isActive: true,
  },
  {
    id: "2",
    name: "Land Assessment Template",
    description: "Comprehensive template for land assessment and evaluation reports.",
    
    sections: [
      {
        id: "section-1",
        title: "Land Description",
        order: 0,
        content: [
          {
            id: "block-1",
            type: "text",
            content: "The land parcel located at ",
          },
          {
            id: "block-2",
            type: "variable",
            content: "{{land_address}}",
            variableName: "land_address",
            variableType: "string",
          },
          {
            id: "block-3",
            type: "text",
            content: " covers an area of ",
          },
          {
            id: "block-4",
            type: "variable",
            content: "{{land_area}}",
            variableName: "land_area",
            variableType: "number",
          },
          {
            id: "block-5",
            type: "text",
            content: " acres.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Assessment Results",
        order: 1,
        content: [
          {
            id: "block-6",
            type: "text",
            content: "The land is classified as ",
          },
          {
            id: "block-7",
            type: "variable",
            content: "{{land_classification}}",
            variableName: "land_classification",
            variableType: "string",
          },
          {
            id: "block-8",
            type: "text",
            content: " with a market value of ",
          },
          {
            id: "block-9",
            type: "variable",
            content: "${{market_value}}",
            variableName: "market_value",
            variableType: "currency",
          },
          {
            id: "block-10",
            type: "text",
            content: " per acre.",
          },
        ],
      },
    ],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18"),
    createdBy: "admin",
    isActive: true,
  },
];

export const sampleData = {
  "property_location": "123 Main Street, Downtown, City",
  "area_size": "2,500",
  "estimated_value": "450,000",
  "valuation_date": "2024-01-15",
  "land_address": "456 Rural Road, County",
  "land_area": "15.5",
  "land_classification": "Residential",
  "market_value": "25,000",
}; 
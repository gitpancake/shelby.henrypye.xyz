import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const SYSTEM_PROMPT = `You are a vehicle service record extraction system. You analyze service documents (invoices, repair orders, CarFAX reports) and extract structured data.

Return ONLY valid JSON matching this schema — no markdown, no code fences, just raw JSON:
{
  "records": [
    {
      "serviceDate": "YYYY-MM-DD",
      "mileage": number | null,
      "shop": "string | null",
      "notes": "string | null",
      "lineItems": [
        {
          "description": "Original description from document",
          "componentName": "Normalized component name",
          "componentCategory": "Category",
          "cost": number | null
        }
      ],
      "serviceNotes": [
        {
          "type": "INSPECTION | MEASUREMENT | RECOMMENDATION | CONCERN | OBSERVATION",
          "title": "Short descriptive title",
          "content": "Full detail text"
        }
      ]
    }
  ]
}

Service Notes extraction rules:
- INSPECTION: MVI/safety inspection results, pass/fail items, inspection reports
- MEASUREMENT: Specific measurements like brake pad thickness, rotor thickness, tire tread depth, drum diameter. Include the actual numbers.
- RECOMMENDATION: Mechanic recommendations for future work (e.g. "Replace front brake pads and rotors", "Rear brake service needed")
- CONCERN: Customer-reported concerns and the mechanic's findings about them (e.g. "Rattling at 60km/h — traced to exhaust system")
- OBSERVATION: Additional findings, early wear indicators, things to monitor (e.g. "Rear differential pinion bearing beginning to produce noise")
- Extract ALL notes, recommendations, measurements, concerns, and observations from the document
- For measurements, include all specific values (mm, inches, 32nds) in the content
- For concerns, include both the customer complaint AND the mechanic's diagnosis/finding
- Each note should have a concise title and detailed content
- Do NOT skip these — they are critical for vehicle tracking

Component normalization rules:
- Use Title Case for component names
- Normalize variations: "Oil & Filter Change" should produce TWO line items — "Engine Oil" and "Oil Filter"
- Split multi-component services into separate line items
- Canonical component names: Engine Oil, Oil Filter, Air Filter, Cabin Air Filter, Spark Plugs, Timing Belt, Serpentine Belt, Brake Pads (Front), Brake Pads (Rear), Brake Rotors (Front), Brake Rotors (Rear), Brake Fluid, Coolant, Transmission Fluid, Power Steering Fluid, Differential Fluid (Front), Differential Fluid (Rear), Transfer Case Fluid, Fuel Filter, Wiper Blades, Battery, Alternator, Starter, Water Pump, Thermostat, Radiator, Wheel Bearing, CV Axle, Tie Rod End, Ball Joint, Control Arm, Shock Absorber, Strut, Exhaust System, Catalytic Converter, O2 Sensor, Ignition Coil, Distributor Cap, Distributor Rotor, Valve Cover Gasket, Head Gasket, Clutch, Flywheel, Driveshaft, U-Joint, Wheel Hub, Brake Caliper, Brake Line, Heater Core, AC Compressor, Blower Motor, Windshield, Tires, Sway Bar End Link, CV Axle Seal, Exhaust Flange, Muffler
- Categories: Fluids, Engine, Brakes, Cooling, Transmission, Drivetrain, Suspension, Steering, Electrical, Exhaust, Filters, Ignition, Body, Tires, HVAC
- Use existing canonical names when they match. For items not in the list, create a sensible Title Case name and pick the best category.
- For CarFAX reports, extract each service event as a separate record
- If mileage is not listed for a record, set to null
- If a date cannot be determined precisely, use the first of the month
- Costs should be numbers (no currency symbols). If cost is for the whole service and can't be split per item, put total on first item and null on rest.`;

export interface ExtractedLineItem {
    description: string;
    componentName: string;
    componentCategory: string;
    cost: number | null;
}

export interface ExtractedNote {
    type:
        | "INSPECTION"
        | "MEASUREMENT"
        | "RECOMMENDATION"
        | "CONCERN"
        | "OBSERVATION";
    title: string;
    content: string;
}

export interface ExtractedRecord {
    serviceDate: string;
    mileage: number | null;
    shop: string | null;
    notes: string | null;
    lineItems: ExtractedLineItem[];
    serviceNotes?: ExtractedNote[];
}

export interface ExtractionResult {
    records: ExtractedRecord[];
}

export async function extractServiceRecords(
    filePath: string,
    mimeType: string,
): Promise<ExtractionResult> {
    const client = new Anthropic();
    const fileData = readFileSync(filePath).toString("base64");

    const isImage = mimeType.startsWith("image/");

    const content: Anthropic.Messages.ContentBlockParam[] = [
        isImage
            ? {
                  type: "image" as const,
                  source: {
                      type: "base64" as const,
                      media_type: mimeType as
                          | "image/jpeg"
                          | "image/png"
                          | "image/gif"
                          | "image/webp",
                      data: fileData,
                  },
              }
            : {
                  type: "document" as const,
                  source: {
                      type: "base64" as const,
                      media_type: "application/pdf" as const,
                      data: fileData,
                  },
              },
        {
            type: "text",
            text: "Extract all service records from this document. Include all inspection findings, measurements, recommendations, customer concerns, and observations as serviceNotes. Return only JSON.",
        },
    ];

    const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find(
        (c): c is Anthropic.Messages.TextBlock => c.type === "text",
    );

    if (!textBlock) {
        throw new Error("No text response from Anthropic");
    }

    const jsonStr = textBlock.text
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

    return JSON.parse(jsonStr) as ExtractionResult;
}

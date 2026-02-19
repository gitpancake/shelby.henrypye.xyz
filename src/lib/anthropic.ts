import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a vehicle service record extraction system. You analyze service documents (invoices, repair orders, CarFAX reports, and parts purchase receipts) and extract structured data.

Return ONLY valid JSON matching this schema — no markdown, no code fences, just raw JSON:
{
  "records": [
    {
      "serviceDate": "YYYY-MM-DD",
      "mileage": number | null,
      "shop": "string | null",
      "currency": "USD | CAD",
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
  ],
  "odometerReadings": [
    {
      "date": "YYYY-MM-DD",
      "mileage": number
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
- Costs should be numbers (no currency symbols).
- For service invoices: use the ACTUAL CHARGED price for each line item as shown on the invoice. If the invoice shows a total/balance due but individual line items don't have separate prices, put the total on the first item and null on the rest. The sum of all line item costs should equal the invoice total or balance due (including tax, shop supplies, environmental fees, etc.). Do NOT exclude tax — use the amounts the customer actually pays.
- If cost is for the whole service and can't be split per item, put total on first item and null on rest.

Parts purchase receipt rules:
- Receipts from auto parts stores (AutoZone, O'Reilly, NAPA, etc.) should be treated as service records — the owner bought and installed the parts
- Use the store name as the "shop" field (e.g. "AutoZone 05372 — Los Angeles, CA")
- If the receipt contains motor oil (any brand/weight), assume an OIL CHANGE was performed: create TWO line items — one for "Engine Oil" (Fluids) and one for "Oil Filter" (Filters). Use the oil description including brand and weight in the Engine Oil description (e.g. "Mobil 1 Extended Performance 5W-30 Motor Oil"). Set Oil Filter cost to null (assumed on hand).
- If the receipt contains a specific component (e.g. alternator, battery, brake pads), assume it was INSTALLED on that date. Use the description including the brand/model/part number (e.g. "Duralast 12802 Import Alternator"). Add an OBSERVATION note with the part details: brand, part number, and any specs visible on the receipt.
- Core charges should NOT be separate line items — just note them in the record's "notes" field (e.g. "Core charge: $40.00")
- Use the receipt date as the service date. For receipts ONLY (not service invoices), use pre-tax item prices for costs.

Currency detection rules:
- Determine the currency for each record: "USD" or "CAD"
- Look for explicit currency indicators: "$CAD", "CA$", "CDN$", Canadian addresses/provinces, or Canadian tax labels (GST, PST, HST)
- US indicators: US state abbreviations, US tax labels, US addresses
- If the shop/store is located in Canada, use "CAD". If in the US, use "USD".
- Default to "USD" if currency cannot be determined

Odometer reading extraction rules:
- Extract standalone mileage/odometer readings that are NOT already associated with a service record
- Handwritten logbook pages may use DD/MM/YYYY date format — convert to YYYY-MM-DD
- If a record in "records" already has a mileage+date, do NOT duplicate it in "odometerReadings"
- Include all odometer readings found (e.g. from logbook entries that just note mileage on a date)
- If no standalone odometer readings are found, return an empty array for "odometerReadings"`;

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
    currency?: string;
    notes: string | null;
    lineItems: ExtractedLineItem[];
    serviceNotes?: ExtractedNote[];
}

export interface ExtractedOdometerReading {
    date: string;
    mileage: number;
}

export interface ExtractionResult {
    records: ExtractedRecord[];
    odometerReadings?: ExtractedOdometerReading[];
}

export async function extractServiceRecords(
    fileBuffer: Buffer,
    mimeType: string,
): Promise<ExtractionResult> {
    const client = new Anthropic();
    const fileData = fileBuffer.toString("base64");

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

export interface DiagnosticItem {
    title: string;
    detail: string;
    component?: string;
    estimatedMiles?: number;
}

export interface DiagnosticResult {
    urgent: DiagnosticItem[];
    upcoming: DiagnosticItem[];
    monitoring: DiagnosticItem[];
    summary: string;
    serviceProviderNotes: string;
}

const DIAGNOSTIC_PROMPT = `You are a vehicle diagnostic specialist analyzing the complete service history of a vehicle. Based on the data provided, generate a comprehensive diagnostic report.

Return ONLY valid JSON matching this schema — no markdown, no code fences, just raw JSON:
{
  "urgent": [{ "title": "Short title", "detail": "Explanation of why this is urgent", "component": "Component name if applicable" }],
  "upcoming": [{ "title": "Short title", "detail": "What needs doing and why", "component": "Component name", "estimatedMiles": number }],
  "monitoring": [{ "title": "Short title", "detail": "What to watch for" }],
  "summary": "2-3 sentence overall vehicle health assessment",
  "serviceProviderNotes": "Paragraph the owner can share with their mechanic summarizing what needs attention, recent concerns, and recommended next steps"
}

Analysis rules:
- URGENT: Things that should be done NOW based on overdue intervals, unresolved concerns, or measurements showing critical wear
- UPCOMING: Maintenance due within the next 5,000 miles or 6 months based on standard intervals and last service dates
- MONITORING: Items to keep an eye on based on observations, early wear, or aging components
- Consider standard maintenance intervals for this specific vehicle (year/make/model)
- Cross-reference concerns and recommendations from mechanics with subsequent service records to see if they were addressed
- Look at measurement trends (e.g. brake pad thickness decreasing across readings)
- Factor in vehicle age and mileage for age-related maintenance (rubber hoses, seals, bushings)
- The serviceProviderNotes should be written as if the owner is handing it to a mechanic — professional, concise, actionable
- If there is insufficient data to make a determination, say so rather than guessing
- Do NOT include items that have clearly been addressed in a more recent service record`;

export async function runDiagnostic(
    vehicleData: string,
): Promise<DiagnosticResult> {
    const client = new Anthropic();

    const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: DIAGNOSTIC_PROMPT,
        messages: [
            {
                role: "user",
                content: vehicleData,
            },
        ],
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

    return JSON.parse(jsonStr) as DiagnosticResult;
}

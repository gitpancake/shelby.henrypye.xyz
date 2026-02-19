export interface VinData {
  make: string;
  model: string;
  year: number;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  engineCylinders: number | null;
  engineModel: string | null;
  displacementL: number | null;
  fuelType: string | null;
  plantCountry: string | null;
}

export async function decodeVin(vin: string): Promise<VinData> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`
  );

  if (!res.ok) {
    throw new Error("Failed to reach NHTSA API");
  }

  const data = await res.json();
  const result = data.Results?.[0];

  if (!result || !result.Make || !result.Model || !result.ModelYear) {
    throw new Error("Could not decode VIN — check that it is valid");
  }

  const str = (val: string | undefined | null) =>
    val && val.trim() ? val.trim() : null;

  const num = (val: string | undefined | null) => {
    if (!val) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  };

  return {
    make: result.Make,
    model: result.Model,
    year: parseInt(result.ModelYear, 10),
    trim: str(result.Trim),
    bodyClass: str(result.BodyClass),
    driveType: str(result.DriveType),
    engineCylinders: num(result.EngineCylinders) as number | null,
    engineModel: str(result.EngineModel),
    displacementL: num(result.DisplacementL),
    fuelType: str(result.FuelTypePrimary),
    plantCountry: str(result.PlantCountry),
  };
}

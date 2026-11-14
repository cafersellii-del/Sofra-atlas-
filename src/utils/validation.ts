export const VALIDATION_BOUNDS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  nameMin: 2,
  nameMax: 80,
  cityNameMin: 2,
  cityNameMax: 60,
  districtMin: 2,
  districtMax: 60,
  prepMin: 2,
  prepMax: 30,
  taglineMin: 4,
  taglineMax: 200,
  emailMin: 5,
  emailMax: 120,
  phoneMin: 6,
  phoneMax: 30,
  addressMin: 5,
  addressMax: 200,
  taxIdMin: 4,
  taxIdMax: 30,
  dishNameMin: 2,
  dishNameMax: 90,
  dishDescMin: 10,
  dishDescMax: 240,
  dishStoryMin: 10,
  dishStoryMax: 400,
  ingredientsMax: 10,
  priceMin: 50,
  priceMax: 25000,
  caloriesMin: 50,
  caloriesMax: 5000,
} as const;

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function parseIngredients(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, VALIDATION_BOUNDS.ingredientsMax);
}

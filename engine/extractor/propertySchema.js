import { z } from 'zod';

// Mirrors core/db/index.js's properties table ENUMs exactly — keep in sync if the schema changes.
const REGION_VALUES = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];
const PROPERTY_TYPE_VALUES = ['zimmer', 'villa', 'cottage', 'suite'];
const KOSHER_VALUES = ['kosher', 'shomer_shabbat', 'kosher_kitchen', 'not_applicable'];

const AMENITY_FIELDS = [
  'has_private_jacuzzi', 'has_private_pool', 'has_heated_pool', 'has_sauna', 'has_view',
  'has_garden', 'has_bbq', 'has_outdoor_jacuzzi', 'has_parking', 'has_air_conditioning',
  'has_equipped_kitchen', 'has_wifi', 'is_kid_friendly', 'is_pet_friendly', 'is_accessible',
];

const amenityShape = Object.fromEntries(AMENITY_FIELDS.map((f) => [f, z.boolean().nullable()]));

/**
 * Step 3.3: "אם מידע חסר — null, לעולם לא ניחוש". Only `name`, `property_type`, and `region`
 * are required — those three are also NOT NULL columns in the DB (see core/db/index.js), so a
 * record the model can't confidently place in a type+region is rejected outright rather than
 * stored with a guessed value. Every other field is nullable.
 */
export const PropertyExtractionSchema = z.object({
  name: z.string().min(2),
  property_type: z.enum(PROPERTY_TYPE_VALUES),
  region: z.enum(REGION_VALUES),
  description: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  guest_capacity: z.number().int().positive().nullable(),
  bedrooms: z.number().int().nonnegative().nullable(),
  beds: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  ...amenityShape,
  kosher_level: z.enum(KOSHER_VALUES).nullable(),
  base_price_night: z.number().positive().nullable(),
  weekend_price: z.number().positive().nullable(),
  holiday_price: z.number().positive().nullable(),
  cleaning_fee: z.number().nonnegative().nullable(),
  min_nights: z.number().int().positive().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  // Per-field confidence 0-100 (Step 3.3: "דרוש מהמודל להחזיר גם confidence לכל שדה") — only
  // for the fields worth grading; booleans/enums are either present or not.
  field_confidence: z.object({
    name: z.number().min(0).max(100),
    property_type: z.number().min(0).max(100),
    region: z.number().min(0).max(100),
    description: z.number().min(0).max(100).nullable(),
    guest_capacity: z.number().min(0).max(100).nullable(),
    base_price_night: z.number().min(0).max(100).nullable(),
    phone: z.number().min(0).max(100).nullable(),
  }),
});

export { AMENITY_FIELDS, REGION_VALUES, PROPERTY_TYPE_VALUES, KOSHER_VALUES };

export const OCCASIONS = ['Work', 'Networking', 'Date', 'Concert', 'Dinner', 'Vacation', 'Weekend', 'Party', 'Custom'] as const;
export const FEELINGS = ['Confident', 'Creative', 'Elegant', 'Relaxed', 'Playful', 'Powerful', 'Authentic'] as const;
export const ENVIRONMENTS = ['Corporate Office', 'Business Casual Office', 'Creative Workplace', 'Remote Work', 'Student', 'Social Events', 'Mixed'] as const;

export const CLOTHING_TYPES = [
  'Dress',
  'Skirt',
  'Blouse',
  'T-Shirt',
  'Shirt',
  'Vest',
  'Jacket',
  'Crop Top',
  'Bralette',
  'Overalls',
  'Jumpsuit'
] as const;

export const MAIN_COLORS = [
  'Black',
  'White',
  'Cream',
  'Beige',
  'Brown',
  'Grey',
  'Blue',
  'Light Blue',
  'Dark Blue',
  'Denim Blue',
  'Green',
  'Red',
  'Pink',
  'Yellow',
  'Orange',
  'Purple',
  'Metallic',
  'Multicolor'
] as const;

export const FABRIC_TYPES = [
  'Denim',
  'Cotton',
  'Linen',
  'Silk',
  'Viscose',
  'Wool',
  'Leather',
  'Polyester',
  'Knit',
  'Unknown'
] as const;

export type Occasion = typeof OCCASIONS[number];
export type Feeling = typeof FEELINGS[number];
export type Environment = typeof ENVIRONMENTS[number];
export type ClothingType = typeof CLOTHING_TYPES[number];
export type MainColor = typeof MAIN_COLORS[number];
export type FabricType = typeof FABRIC_TYPES[number];
export type ExpressionLevel = 'Conservative' | 'Balanced' | 'Statement';
export type WearTiming = 'Today' | 'Tomorrow' | 'This Week' | 'Just Exploring';

export type ItemAnalysis = {
  isSingleItem: boolean;
  error?: string;
  category: ClothingType | string;
  color: MainColor | string;
  material: FabricType | string;
  pattern: string;
  fitOrSilhouette?: string;
  formality?: string;
  confidence: number;
  notes?: string;
};

export type Recommendation = {
  id: string;
  title: string;
  type: string;
  rationale: string;
  explanation: string;
  pairings: string[];
  visualPrompt: string;
  moodboardImage?: string | null;

  reference?: string;
  unexpectedMove?: string;

  rating?: string;
  status?: string;
};

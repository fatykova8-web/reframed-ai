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
export type ReferenceType =
  | 'designer'
  | 'celebrity/musician'
  | 'movie/tv'
  | 'event'
  | 'food/drink'
  | 'place/travel'
  | 'aesthetic'
  | 'historical era'
  | 'vague/unknown';

export type ItemAnalysis = {
  isSingleItem: boolean;
  error?: string;
  category: ClothingType | string;
  color: MainColor | string;
  material: FabricType | string;
  pattern: string;
  fitOrSilhouette?: string;
  fit?: string;
  sleeveLength?: string;
  length?: string;
  collarOrNeckline?: string;
  majorDetails?: string[];
  formality?: string;
  confidence: number;
  notes?: string;
};

export type InspirationDirection = {
  title: string;
  referenceType?: ReferenceType;
  interpretation: string;
  stylingCodes: string[];
  wearableTranslation: string;
  tension: string;
  whyThisFits: string;
  scores?: InspirationDirectionScore;
};

export type InspirationDirectionScore = {
  groundingScore: number;
  culturalAccuracyScore: number;
  fashionTranslationScore: number;
};

export type Recommendation = {
  id: string;
  type: ExpressionLevel;
  title: string;
  rationale: string;
  reference?: string;
  unexpectedMove?: string;
  pairings: string[];
  explanation: string;
  visualPrompt: string;
  moodboardImage?: string | null;
  qualityScores?: RecommendationScore;
  rating?: 'Love It' | 'Like It' | 'Not For Me';
  status?: 'Wore It' | "Didn't Wear It";
};

export type RecommendationScore = {
  referenceFit: number;
  garmentFidelity: number;
  wearability: number;
  originality: number;
  visualPromptCompleteness: number;
  critique: string;
};

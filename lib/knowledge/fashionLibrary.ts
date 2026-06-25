export type FashionReference = {
  name: string;
  meaning: string;
  stylingCodes: string[];
  wearableTranslation: string;
};

export const FASHION_LIBRARY: FashionReference[] = [
  {
    name: 'Canadian Tuxedo',
    meaning:
      'Denim-on-denim made iconic through pop culture, best modernized with intentional wash contrast.',
    stylingCodes: ['mixed denim washes', 'sharp belt', 'clean proportions', 'polished accessory'],
    wearableTranslation:
      'Use tonal denim as a full look, then sharpen it with one structured or refined piece.'
  },
  {
    name: 'Y2K Pop',
    meaning:
      'Early-2000s optimism, glossy color, playful proportions, and celebrity street-style energy.',
    stylingCodes: ['baby tee proportion', 'sparkle', 'tiny bag energy', 'playful color'],
    wearableTranslation:
      'Keep one nostalgic cue visible and ground it with simple contemporary basics.'
  },
  {
    name: 'Bauhaus',
    meaning:
      'Modernist design language built from geometry, primary-color contrast, and functional clarity.',
    stylingCodes: ['color blocking', 'clean lines', 'geometric accessories', 'primary accents'],
    wearableTranslation:
      'Use one geometric or color-blocked move while keeping the silhouette clean.'
  },
  {
    name: 'Studio 54',
    meaning:
      'Disco-era glamour with shine, movement, nightlife confidence, and controlled drama.',
    stylingCodes: ['metallic shine', 'fluid fabric', 'open neckline', 'evening polish'],
    wearableTranslation:
      'Add one light-catching piece and balance it with relaxed, wearable styling.'
  },
  {
    name: 'Iris Apfel',
    meaning:
      'Maximalist personal style driven by color, texture, scale, and unapologetic accessorizing.',
    stylingCodes: ['stacked accessories', 'bold color', 'texture mix', 'oversized proportion'],
    wearableTranslation:
      'Choose one maximalist focal point and keep the outfit intentionally composed around it.'
  },
  {
    name: 'Schiaparelli',
    meaning:
      'Surrealist elegance with sculptural shapes, witty details, and one strange refined accent.',
    stylingCodes: ['surreal detail', 'sculptural jewelry', 'black and gold', 'unexpected placement'],
    wearableTranslation:
      'Let one surreal or sculptural accent create intrigue while the outfit stays polished.'
  },
  {
    name: 'Dali',
    meaning:
      'Surrealism, dream logic, distorted scale, symbolic objects, and theatrical wit.',
    stylingCodes: ['melting shape', 'symbolic motif', 'odd proportion', 'dreamlike contrast'],
    wearableTranslation:
      'Translate surrealism through one unusual proportion, motif, or accessory rather than full costume.'
  },
  {
    name: 'Miu Miu',
    meaning:
      'Prep codes made mischievous through proportion play, visible layers, and off-kilter polish.',
    stylingCodes: ['micro proportion', 'visible socks', 'collar detail', 'school-uniform tension'],
    wearableTranslation:
      'Make a classic piece feel current with one intentionally awkward or youthful styling code.'
  }
];

export function fashionLibraryPromptText() {
  return FASHION_LIBRARY.map((reference) => {
    return `- ${reference.name}: ${reference.meaning} Codes: ${reference.stylingCodes.join(', ')}. Wearable translation: ${reference.wearableTranslation}`;
  }).join('\n');
}

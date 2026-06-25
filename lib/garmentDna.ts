import type { ItemAnalysis } from './types';

export function garmentDnaFields(analysis: ItemAnalysis) {
  return {
    category: analysis.category || 'unknown category',
    color: analysis.color || 'unknown color',
    material: analysis.material || 'unknown material',
    pattern: analysis.pattern || 'unknown pattern',
    silhouette: analysis.fitOrSilhouette || 'original silhouette',
    fit: analysis.fit || analysis.fitOrSilhouette || 'original fit',
    sleeveLength: analysis.sleeveLength || 'original sleeve length',
    length: analysis.length || 'original length',
    collarOrNeckline: analysis.collarOrNeckline || 'original collar or neckline',
    majorDetails: analysis.majorDetails?.length
      ? analysis.majorDetails.join(', ')
      : analysis.notes || 'original visible details'
  };
}

export function garmentDnaText(analysis: ItemAnalysis) {
  const dna = garmentDnaFields(analysis);

  return [
    `category: ${dna.category}`,
    `color: ${dna.color}`,
    `material: ${dna.material}`,
    `pattern: ${dna.pattern}`,
    `silhouette: ${dna.silhouette}`,
    `fit: ${dna.fit}`,
    `sleeve length: ${dna.sleeveLength}`,
    `length: ${dna.length}`,
    `collar/neckline: ${dna.collarOrNeckline}`,
    `major details: ${dna.majorDetails}`
  ].join('; ');
}

export function garmentDnaLockText(analysis: ItemAnalysis) {
  return `Garment DNA: ${garmentDnaText(analysis)}. Keep the uploaded garment unchanged: same color, same shape, same style, same size/proportions, same sleeve length, same length, same pattern, same material. Do not crop, shorten, recolor, restyle, or transform the garment.`;
}

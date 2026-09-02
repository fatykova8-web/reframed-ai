export type FashionHistoryReference = {
  era: string;
  label: string;
  context: string;
  fashionMeaning: string;
  keyCodes: string[];
  silhouettes: string[];
  colors: string[];
  materials: string[];
  designersOrFigures: string[];
  culturalForces: string[];
  wearableTranslation: string;
  avoid: string[];
};

export const FASHION_HISTORY_LIBRARY: FashionHistoryReference[] = [
  {
    era: '1920s',
    label: 'Roaring Twenties Modernity',
    context:
      'Postwar social freedom, jazz culture, Art Deco, sport, and women testing a less restricted public identity.',
    fashionMeaning:
      'A break from heavy Edwardian dressing into movement, shorter hems, graphic line, and modern ease.',
    keyCodes: ['Art Deco geometry', 'drop waist', 'cloche shape', 'beaded shine', 'sportif ease'],
    silhouettes: ['tubular dress', 'low waist', 'straight line', 'handkerchief hem', 'boyish drape'],
    colors: ['black', 'cream', 'silver', 'jade', 'gold', 'powdery pastels'],
    materials: ['crepe de chine', 'silk', 'chiffon', 'beading', 'satin'],
    designersOrFigures: ['Coco Chanel', 'Jeanne Lanvin', 'Jean Patou', 'Josephine Baker'],
    culturalForces: ['jazz age', 'Art Deco', 'flapper culture', 'sportswear influence'],
    wearableTranslation:
      'Use one linear, gleaming, or dropped-proportion cue with modern simple pieces.',
    avoid: ['costume flapper fringe', 'head-to-toe vintage', 'party costume literalness']
  },
  {
    era: '1930s',
    label: 'Escapist Goddess Glamour',
    context:
      'Economic depression and prewar anxiety created appetite for Hollywood fantasy, elegance, and surreal wit.',
    fashionMeaning:
      'Fluid glamour and dream logic: body-skimming bias cuts by night, surreal details by day.',
    keyCodes: ['bias cut', 'goddess drape', 'surreal detail', 'long line', 'soft shine'],
    silhouettes: ['floor-skimming line', 'natural waist', 'fluid column', 'soft shoulder', 'figure-skimming drape'],
    colors: ['ivory', 'black', 'silver', 'oxblood', 'deep green', 'champagne'],
    materials: ['satin', 'silk', 'rayon', 'velvet', 'crepe'],
    designersOrFigures: ['Madeleine Vionnet', 'Elsa Schiaparelli', 'Adrian', 'Marlene Dietrich'],
    culturalForces: ['Hollywood escapism', 'surrealism', 'fashion photography', 'femme fatale imagery'],
    wearableTranslation:
      'Combine fluid fabric or a long line with one strange refined accent.',
    avoid: ['confusing 1930s with 1920s flapper styling', 'overly theatrical costume']
  },
  {
    era: '1940s',
    label: 'Wartime Utility And New Look',
    context:
      'World War II rationing pushed practical dressing, then Dior 1947 signaled a dramatic return to glamour.',
    fashionMeaning:
      'Crisp utility, strong shoulders, practical separates, and then a postwar hunger for volume and beauty.',
    keyCodes: ['utility tailoring', 'strong shoulder', 'shirtwaist', 'sensible shoe', 'New Look waist'],
    silhouettes: ['boxy jacket', 'knee-length skirt', 'nipped waist', 'A-line skirt', 'structured shoulder'],
    colors: ['navy', 'khaki', 'black', 'brown', 'red accent', 'cream'],
    materials: ['wool', 'cotton', 'rayon', 'gabardine', 'crepe'],
    designersOrFigures: ['Christian Dior', 'Claire McCardell', 'Rosie the Riveter'],
    culturalForces: ['wartime rationing', 'women at work', 'postwar optimism', 'Paris couture return'],
    wearableTranslation:
      'Use practical tailoring, a defined waist, or a sharp shoulder to make softness feel decisive.',
    avoid: ['military costume', 'too much retro polish', 'stiff period reproduction']
  },
  {
    era: '1950s',
    label: 'Couture Golden Age',
    context:
      'Postwar glamour, Dior-era couture, Hollywood polish, and coordinated dressing shaped an ideal of controlled beauty.',
    fashionMeaning:
      'Extravagant femininity: nipped waists, full skirts, refined accessories, and impeccable finish.',
    keyCodes: ['New Look waist', 'full skirt', 'matching accessories', 'cocktail polish', 'couture structure'],
    silhouettes: ['hourglass', 'full midi skirt', 'fitted bodice', 'trapeze line', 'neat cardigan set'],
    colors: ['black', 'cream', 'red', 'powder pink', 'navy', 'butter yellow'],
    materials: ['taffeta', 'wool suiting', 'silk', 'satin', 'cotton poplin'],
    designersOrFigures: ['Christian Dior', 'Cristobal Balenciaga', 'Hubert de Givenchy', 'Grace Kelly'],
    culturalForces: ['Hollywood glamour', 'couture expansion', 'domestic ideal', 'department-store copies'],
    wearableTranslation:
      'Use one waist-defining or polished accessory move while keeping the rest modern.',
    avoid: ['housewife costume', 'over-coordination', 'too precious styling']
  },
  {
    era: '1960s',
    label: 'Youthquake And Space Age',
    context:
      'Youth culture, Mod London, civil rights, second-wave feminism, space-age optimism, and late-decade bohemia.',
    fashionMeaning:
      'Fashion turns young, graphic, short, synthetic, and experimental before opening into bohemian self-expression.',
    keyCodes: ['mini length', 'Mod contrast', 'graphic color', 'space-age shine', 'boho beginnings'],
    silhouettes: ['shift dress', 'mini skirt', 'A-line coat', 'slim trouser', 'tunic over pants'],
    colors: ['black and white', 'primary color', 'silver', 'orange', 'white', 'psychedelic brights'],
    materials: ['vinyl', 'wool crepe', 'synthetics', 'cotton', 'metallic finish'],
    designersOrFigures: ['Mary Quant', 'Andre Courreges', 'Pierre Cardin', 'Yves Saint Laurent'],
    culturalForces: ['Youthquake', 'space race', 'Mod music culture', 'bohemian counterculture'],
    wearableTranslation:
      'Add one graphic, abbreviated, or futuristic element to clean modern basics.',
    avoid: ['costume go-go styling', 'random psychedelic overload', 'too literal retro makeup']
  },
  {
    era: '1970s',
    label: 'Liberated Ease And Disco',
    context:
      'Women’s liberation, designer denim, disco nightlife, global influence, and punk rebellion widened personal style.',
    fashionMeaning:
      'A decade of freedom: relaxed sportswear, wrap dressing, denim, shine, bohemia, and subcultural edge.',
    keyCodes: ['wrap shape', 'designer denim', 'disco shine', 'fringe or suede', 'punk disruption'],
    silhouettes: ['wide-leg trouser', 'wrap dress', 'flare jean', 'fluid jersey', 'long lean line'],
    colors: ['camel', 'chocolate', 'cream', 'gold', 'rust', 'emerald', 'black'],
    materials: ['jersey', 'denim', 'suede', 'satin', 'lurex'],
    designersOrFigures: ['Diane von Furstenberg', 'Halston', 'Yves Saint Laurent', 'Vivienne Westwood'],
    culturalForces: ['women’s liberation', 'Studio 54', 'punk', 'global travel fantasy'],
    wearableTranslation:
      'Use movement, denim, shine, or a wrap/flare silhouette to make dressing feel easy but expressive.',
    avoid: ['costume disco', 'too many brown suede cues', 'festival cliche']
  },
  {
    era: '1980s',
    label: 'Power Dressing And Concept',
    context:
      'Corporate ambition, MTV image culture, fitness, luxury excess, and Japanese avant-garde reshaped fashion extremes.',
    fashionMeaning:
      'Big presence: shoulders, body-conscious stretch, high contrast, logo polish, and conceptual anti-glamour.',
    keyCodes: ['power shoulder', 'cinched belt', 'bodycon stretch', 'high shine', 'conceptual black'],
    silhouettes: ['oversized blazer', 'pencil skirt', 'strong shoulder dress', 'leggings line', 'architectural volume'],
    colors: ['black', 'red', 'electric blue', 'white', 'gold', 'acid brights'],
    materials: ['leather', 'Lycra', 'wool suiting', 'sequins', 'taffeta'],
    designersOrFigures: ['Thierry Mugler', 'Azzedine Alaia', 'Giorgio Armani', 'Rei Kawakubo'],
    culturalForces: ['power dressing', 'MTV', 'fitness culture', 'Japanese avant-garde', 'luxury capitalism'],
    wearableTranslation:
      'Choose one strong proportion or high-impact finish, then keep the outfit edited.',
    avoid: ['shoulder-pad caricature', 'office costume', 'too much shine at once']
  },
  {
    era: '1990s',
    label: 'Minimalism Meets Grunge',
    context:
      'Supermodels, grunge, minimalism, deconstruction, and early digital culture split fashion between polish and refusal.',
    fashionMeaning:
      'Less-is-more restraint coexists with thrift-store disruption and experimental runway drama.',
    keyCodes: ['slip dress line', 'clean black', 'grunge layering', 'deconstructed edge', 'bare sandal'],
    silhouettes: ['column dress', 'straight-leg jean', 'oversized cardigan', 'minimal tank', 'long skirt'],
    colors: ['black', 'white', 'charcoal', 'brown', 'deep red', 'washed plaid'],
    materials: ['silk satin', 'cotton jersey', 'denim', 'flannel', 'leather'],
    designersOrFigures: ['Helmut Lang', 'Calvin Klein', 'Martin Margiela', 'John Galliano', 'Alexander McQueen'],
    culturalForces: ['supermodel era', 'grunge', 'minimalism', 'deconstruction', 'early internet'],
    wearableTranslation:
      'Let one severe or undone element make the outfit feel intentional without trying too hard.',
    avoid: ['plain basics with no tension', 'messy grunge without shape', 'generic 90s nostalgia']
  },
  {
    era: '2000s',
    label: 'Paparazzi Fantasy And Runway Excess',
    context:
      'Celebrity culture, logomania, It bags, low-rise silhouettes, boho styling, and theatrical runway fantasy dominated.',
    fashionMeaning:
      'High visibility dressing: glossy, referential, body-aware, accessory-heavy, and sometimes deliciously chaotic.',
    keyCodes: ['low-rise proportion', 'It bag energy', 'boho layer', 'corsetry', 'runway fantasy'],
    silhouettes: ['bootcut jean', 'micro mini', 'slip-over-denim', 'corseted waist', 'romantic asymmetric drape'],
    colors: ['chocolate', 'cream', 'hot pink', 'turquoise', 'antique gold', 'black'],
    materials: ['denim', 'chiffon', 'satin', 'leather', 'metallic trim'],
    designersOrFigures: ['John Galliano', 'Tom Ford for Gucci', 'Marc Jacobs', 'Sienna Miller', 'Paris Hilton'],
    culturalForces: ['paparazzi style', 'red carpet culture', 'boho chic', 'logomania', 'Y2K optimism'],
    wearableTranslation:
      'Use one glossy, romantic, or paparazzi-era styling cue with calmer modern grounding.',
    avoid: ['unfiltered Y2K costume', 'too many logos', 'low-rise styling that feels impractical']
  },
  {
    era: '2010s',
    label: 'Digital Fashion Age',
    context:
      'Instagram, streetwear luxury, athleisure, collaborations, influencer dressing, and maximalist image culture accelerated trends.',
    fashionMeaning:
      'Fashion becomes camera-aware: statement accessories, sneakers, streetwear codes, and high-low styling.',
    keyCodes: ['athleisure polish', 'streetwear luxury', 'statement sneaker', 'maximalist print', 'logo irony'],
    silhouettes: ['oversized hoodie', 'slip skirt', 'bike short', 'wide trouser', 'chunky sneaker base'],
    colors: ['millennial pink', 'neon accent', 'beige', 'black', 'logo brights'],
    materials: ['technical nylon', 'satin', 'jersey', 'denim', 'faux fur'],
    designersOrFigures: ['Alessandro Michele', 'Virgil Abloh', 'Phoebe Philo', 'Demna'],
    culturalForces: ['Instagram', 'streetwear', 'athleisure', 'influencer culture', 'luxury collaborations'],
    wearableTranslation:
      'Use one camera-readable statement piece with practical streetwear or soft tailoring.',
    avoid: ['trend pileup', 'outfit made only for photos', 'dated influencer styling']
  },
  {
    era: '2020s',
    label: 'Post-Trend Personal Style',
    context:
      'Post-pandemic comfort, resale, TikTok microtrends, quiet luxury, Y2K revival, and trend fatigue push people toward identity-driven styling.',
    fashionMeaning:
      'The decade is less one look than a negotiation between comfort, nostalgia, restraint, and personal authorship.',
    keyCodes: ['quiet luxury restraint', 'microtrend remix', 'comfort polish', 'resale individuality', 'personal uniform'],
    silhouettes: ['relaxed trouser', 'oversized layer', 'slip skirt', 'column dress', 'clean flat shoe'],
    colors: ['black', 'white', 'grey', 'butter yellow', 'brown', 'soft red', 'chrome'],
    materials: ['knit', 'denim', 'leather', 'cotton poplin', 'satin'],
    designersOrFigures: ['Miu Miu', 'The Row', 'Schiaparelli', 'Telfar', 'Sandy Liang'],
    culturalForces: ['TikTok', 'quiet luxury', 'resale', 'remote work', 'Y2K revival', 'microtrend fatigue'],
    wearableTranslation:
      'Make the item feel personally chosen through one sharp styling decision, not trend accumulation.',
    avoid: ['copying a microtrend exactly', 'generic quiet luxury', 'too many references at once']
  },
  {
    era: '2000s runway',
    label: 'Galliano-Era Theatrical Romance',
    context:
      'Late 1990s and early 2000s runway fantasy used historical reference, romance, styling drama, and couture-level storytelling.',
    fashionMeaning:
      'A basic item becomes memorable through drape, antique color, corsetry, asymmetry, and one theatrical styling gesture.',
    keyCodes: ['historical fantasy', 'corseted tension', 'asymmetric drape', 'antique metallic', 'romantic disorder'],
    silhouettes: ['nipped waist', 'bias drape', 'long skirt', 'soft volume', 'off-center styling'],
    colors: ['tea stain', 'oxblood', 'antique gold', 'black', 'dusty rose', 'parchment'],
    materials: ['chiffon', 'satin', 'velvet', 'lace', 'aged metallic'],
    designersOrFigures: ['John Galliano', 'Dior couture', 'Alexander McQueen', 'theatrical runway styling'],
    culturalForces: ['runway spectacle', 'historical revival', 'celebrity fashion fantasy'],
    wearableTranslation:
      'Add one romantic historical cue to modern basics so the look feels dramatic but still wearable.',
    avoid: ['full costume', 'random vintage clutter', 'changing the uploaded garment into couture']
  },
  {
    era: 'cross-era',
    label: 'Gothic Fashion Lineage',
    context:
      'Gothic style moves through Victorian mourning, punk, New Romantic drama, 1990s minimal darkness, and contemporary romantic goth.',
    fashionMeaning:
      'Darkness becomes fashion through contrast: severity, romance, covered skin, shine, lace, leather, and controlled mystery.',
    keyCodes: ['black column', 'lace or sheer', 'silver hardware', 'covered neckline', 'romantic severity'],
    silhouettes: ['long skirt', 'sharp coat', 'slim trouser', 'column dress', 'high neckline'],
    colors: ['black', 'oxblood', 'silver', 'ivory', 'charcoal', 'deep purple'],
    materials: ['velvet', 'lace', 'leather', 'mesh', 'satin'],
    designersOrFigures: ['Alexander McQueen', 'Ann Demeulemeester', 'Rick Owens', 'Vivienne Westwood'],
    culturalForces: ['Victorian mourning', 'punk', 'New Romantic style', 'club culture'],
    wearableTranslation:
      'Use one dark romantic texture or severe line against the uploaded garment.',
    avoid: ['Halloween costume', 'all-black without texture', 'too many gothic signals at once']
  }
];

export function fashionHistoryPromptText() {
  return FASHION_HISTORY_LIBRARY.map((reference) => {
    return [
      `- ${reference.era} / ${reference.label}: ${reference.context}`,
      `Fashion meaning: ${reference.fashionMeaning}`,
      `Codes: ${reference.keyCodes.join(', ')}`,
      `Silhouettes: ${reference.silhouettes.join(', ')}`,
      `Colors: ${reference.colors.join(', ')}`,
      `Materials: ${reference.materials.join(', ')}`,
      `Designers/figures: ${reference.designersOrFigures.join(', ')}`,
      `Cultural forces: ${reference.culturalForces.join(', ')}`,
      `Wearable translation: ${reference.wearableTranslation}`,
      `Avoid: ${reference.avoid.join(', ')}`
    ].join(' ');
  }).join('\n');
}

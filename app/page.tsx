'use client';

import { useMemo, useState } from 'react';
import {
  CLOTHING_TYPES,
  FABRIC_TYPES,
  FEELINGS,
  MAIN_COLORS,
  OCCASIONS,
  type InspirationDirection,
  type ItemAnalysis,
  type Recommendation
} from '@/lib/types';

type Screen =
  | 'landing'
  | 'upload'
  | 'itemDetails'
  | 'occasion'
  | 'feeling'
  | 'inspiration'
  | 'clarifyInspiration'
  | 'loading'
  | 'recommendations'
  | 'saved';

type AnalyzeResult = { analysis?: ItemAnalysis; error?: string };
type GenerateResult = { recommendations?: Recommendation[]; error?: string };
type RefineResult = { recommendation?: Recommendation; error?: string };
type ClarifyResult = {
  referenceType?: string;
  directions?: InspirationDirection[];
  error?: string;
};

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T & { error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as T & { error?: string };
    } catch (error) {
      console.error('[api-debug] Failed to parse JSON response', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        bodyStart: text.slice(0, 160),
        error
      });

      return { error: fallbackMessage } as T & { error?: string };
    }
  }

  console.error('[api-debug] Non-JSON API response', {
    status: response.status,
    statusText: response.statusText,
    contentType,
    bodyStart: text.slice(0, 240)
  });

  return {
    error: text.trim() || fallbackMessage
  } as T & { error?: string };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function OptionButton({
  label,
  selected,
  onClick
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left text-sm font-medium transition ${
        selected
          ? 'border-black bg-black text-white'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-medium"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [occasion, setOccasion] = useState<string>('');
  const [feeling, setFeeling] = useState<string>('');
  const [inspiration, setInspiration] = useState<string>('');
  const [inspirationDirections, setInspirationDirections] = useState<InspirationDirection[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<InspirationDirection | null>(null);
  const [clarifying, setClarifying] = useState(false);

  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);
  const [looks, setLooks] = useState<Recommendation[]>([]);
  const [refiningLookId, setRefiningLookId] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const canGenerate = useMemo(
    () => Boolean(analysis && occasion && feeling),
    [analysis, occasion, feeling]
  );

  function navigate(next: Screen) {
    setScreen(next);
    setError('');
    window.scrollTo(0, 0);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    if (!SUPPORTED_IMAGE_TYPES.includes(uploaded.type)) {
      setError('Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (uploaded.size > MAX_UPLOAD_BYTES) {
      setError('This image is too large. Please upload an image under 3 MB.');
      console.error('[upload-debug] Upload rejected before API request', {
        fileName: uploaded.name,
        fileType: uploaded.type,
        fileSizeBytes: uploaded.size,
        maxUploadBytes: MAX_UPLOAD_BYTES
      });
      return;
    }

    setFile(uploaded);
    setPreview(URL.createObjectURL(uploaded));
    setAnalysis(null);
    setLooks([]);
    setInspirationDirections([]);
    setSelectedDirection(null);
    setError('');
    setAnalyzing(true);

    try {
      const imageBase64 = await fileToBase64(uploaded);
      const requestBody = JSON.stringify({ imageBase64, imageMimeType: uploaded.type });
      console.info('[upload-debug] Posting analyze-item request', {
        fileName: uploaded.name,
        fileType: uploaded.type,
        fileSizeBytes: uploaded.size,
        base64Length: imageBase64.length,
        requestBodyBytes: new Blob([requestBody]).size
      });

      const response = await fetch('/api/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });

      console.info('[upload-debug] analyze-item response received', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      const data = await readJsonResponse<AnalyzeResult>(
        response,
        'Could not analyze this item.'
      );

      if (!response.ok || !data.analysis) {
        setError(data.error || 'Could not analyze this item.');
        return;
      }

      if (!data.analysis.isSingleItem) {
        setError(data.analysis.error || 'Please upload one supported clothing item.');
      }

      setAnalysis({
        ...data.analysis,
        category: CLOTHING_TYPES.includes(data.analysis.category as any)
          ? data.analysis.category
          : 'Dress',
        color: MAIN_COLORS.includes(data.analysis.color as any)
          ? data.analysis.color
          : 'Multicolor',
        material: FABRIC_TYPES.includes(data.analysis.material as any)
          ? data.analysis.material
          : 'Unknown'
      });

      setScreen('itemDetails');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong during item recognition.');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateAnalysis(field: 'category' | 'color' | 'material', value: string) {
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
            confidence: 1,
            notes: `${prev.notes || ''} User confirmed/edited ${field}.`.trim()
          }
        : prev
    );
  }

  async function clarifyInspiration() {
    if (!inspiration.trim()) {
      generateLooks();
      return;
    }

    setClarifying(true);
    setSelectedDirection(null);
    setError('');

    try {
      const response = await fetch('/api/clarify-inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspiration })
      });

      const data = await readJsonResponse<ClarifyResult>(
        response,
        'Could not clarify inspiration.'
      );

      if (!response.ok || !data.directions) {
        setError(data.error || 'Could not clarify inspiration.');
        return;
      }

      setInspirationDirections(data.directions);
      setScreen('clarifyInspiration');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setClarifying(false);
    }
  }

  async function generateLooks() {
    if (!analysis || !canGenerate) return;

    navigate('loading');

    try {
      const response = await fetch('/api/generate-looks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          occasion,
          feeling,
          inspiration,
          inspirationDirection: selectedDirection
        })
      });

      const data = await readJsonResponse<GenerateResult>(
        response,
        'Could not generate looks.'
      );

      if (!response.ok) {
        setError(data.error || 'Could not generate looks.');
        setScreen('itemDetails');
        return;
      }

      setLooks(
        (data.recommendations || []).map((look) => ({
          ...look,
          uploadedItemImage: preview
        }))
      );
      setScreen('recommendations');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setScreen('itemDetails');
    }
  }

  async function refineLook(look: Recommendation, feedback: string) {
    if (!analysis) return;

    setRefiningLookId(look.id);
    setError('');

    try {
      const response = await fetch('/api/refine-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          occasion,
          feeling,
          inspiration,
          inspirationDirection: selectedDirection,
          originalLook: look,
          feedback
        })
      });

      const data = await readJsonResponse<RefineResult>(
        response,
        'Could not refine this look.'
      );

      if (!response.ok || !data.recommendation) {
        setError(data.error || 'Could not refine this look.');
        return;
      }

      const updatedLook = {
        ...data.recommendation,
        id: look.id,
        moodboardImage: data.recommendation.moodboardImage ?? null,
        uploadedItemImage: look.uploadedItemImage ?? preview
      };

      setLooks((prev) =>
        prev.map((item) => (item.id === look.id ? updatedLook : item))
      );

      setSavedLooks((prev) =>
        prev.map((item) => (item.id === look.id ? updatedLook : item))
      );
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while refining.');
    } finally {
      setRefiningLookId(null);
    }
  }

  function saveLook(look: Recommendation) {
    setSavedLooks((prev) =>
      prev.some((item) => item.id === look.id) ? prev : [...prev, look]
    );
  }

  function updateFeedback(id: string, field: 'rating' | 'status', value: string) {
    const updater = (items: Recommendation[]) =>
      items.map((look) => (look.id === id ? { ...look, [field]: value } : look));

    setLooks(updater);
    setSavedLooks(updater);
  }

  function renderLookCard(look: Recommendation, isSaved = false) {
    return (
      <article
        key={look.id}
        className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {look.type}
          </p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">{look.title}</h3>
        </div>

        <div className="relative mb-4 aspect-square overflow-hidden rounded-3xl bg-neutral-100 text-sm text-neutral-400">
          {look.moodboardImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={look.moodboardImage}
              alt={look.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="font-medium text-neutral-500">Collage preview unavailable</p>
            </div>
          )}

          {look.uploadedItemImage && (
            <div className="absolute left-3 top-3 w-[38%] overflow-hidden rounded-2xl border border-white bg-white shadow-xl ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={look.uploadedItemImage}
                alt="Exact uploaded item"
                className="aspect-square w-full object-cover"
              />
              <div className="border-t border-neutral-100 px-2 py-1.5">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Exact item
                </p>
              </div>
            </div>
          )}
        </div>

        {look.reference && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Reference
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{look.reference}</p>
          </div>
        )}

        {look.unexpectedMove && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Unexpected move
            </p>
            <p className="mt-1 text-sm text-neutral-700">{look.unexpectedMove}</p>
          </div>
        )}

        <p className="mb-4 text-sm italic leading-relaxed text-neutral-600">
          “{look.rationale}”
        </p>

        <div className="mb-4 rounded-2xl bg-neutral-50 p-4">
          <h4 className="mb-2 text-sm font-semibold">Pair with</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {look.pairings.map((pairing) => (
              <li key={pairing}>{pairing}</li>
            ))}
          </ul>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-neutral-700">
          {look.explanation}
        </p>

        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          {!isSaved && (
            <button
              onClick={() => saveLook(look)}
              className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
          )}

          <select
            value={look.rating || ''}
            onChange={(e) => updateFeedback(look.id, 'rating', e.target.value)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Rate it...
            </option>
            <option value="Love It">Love It</option>
            <option value="Like It">Like It</option>
            <option value="Not For Me">Not For Me</option>
          </select>

          <select
            value={look.status || ''}
            onChange={(e) => updateFeedback(look.id, 'status', e.target.value)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Status...
            </option>
            <option value="Wore It">Wore It</option>
            <option value="Didn't Wear It">Didn't Wear It</option>
          </select>

          <div className="mt-3 w-full border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Refine this look
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                'Too basic',
                'Not wearable',
                'More artistic',
                'More reference',
                'More colorful',
                'Less costume-like'
              ].map((feedback) => (
                <button
                  key={feedback}
                  disabled={refiningLookId === look.id}
                  onClick={() => refineLook(look, feedback)}
                  className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  {refiningLookId === look.id ? 'Refining...' : feedback}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white text-neutral-950 shadow-xl">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white/90 p-4 backdrop-blur">
        <button
          onClick={() => navigate('landing')}
          className="text-xl font-bold tracking-tight"
        >
          Reframed
        </button>
        <button
          onClick={() => navigate('saved')}
          className="text-sm font-medium underline"
        >
          Saved ({savedLooks.length})
        </button>
      </header>

      <section className="p-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {screen === 'landing' && (
          <div className="flex min-h-[70vh] flex-col justify-center gap-8 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
              Local AI Prototype
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Style the pieces you love but never reach for.
            </h1>
            <p className="text-neutral-500">
              Upload one difficult item. Confirm what it is. Translate a cultural
              reference into wearable styling directions.
            </p>
            <button
              onClick={() => navigate('upload')}
              className="rounded-full bg-black px-8 py-4 font-semibold text-white"
            >
              Style an Item
            </button>
          </div>
        )}

        {screen === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Upload your item</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Use one clear clothing item. Accessories and shoes are not supported in this MVP.
              </p>
            </div>

            <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-neutral-300 bg-neutral-50 text-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Uploaded item"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="p-8 text-sm text-neutral-500">
                  <p className="font-medium">Tap to use camera or gallery</p>
                  <p className="mt-2">Choose a photo where the item fills most of the frame.</p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0"
              />
            </label>

            {analyzing && (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                Recognizing item...
              </div>
            )}

            {file && !analyzing && (
              <button
                onClick={() => navigate('itemDetails')}
                className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {screen === 'itemDetails' && analysis && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Confirm the item</h2>
              <p className="mt-2 text-sm text-neutral-500">
                AI made a first guess. Correct it before recommendations.
              </p>
            </div>

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Uploaded item"
                className="aspect-square w-full rounded-[2rem] object-cover"
              />
            )}

            <div className="space-y-4 rounded-[2rem] border border-neutral-200 p-4">
              <FieldSelect
                label="Clothing type"
                value={analysis.category}
                options={CLOTHING_TYPES}
                onChange={(v) => updateAnalysis('category', v)}
              />
              <FieldSelect
                label="Main color"
                value={analysis.color}
                options={MAIN_COLORS}
                onChange={(v) => updateAnalysis('color', v)}
              />
              <FieldSelect
                label="Fabric"
                value={analysis.material}
                options={FABRIC_TYPES}
                onChange={(v) => updateAnalysis('material', v)}
              />
              <p className="text-xs text-neutral-500">
                Confidence: {Math.round((analysis.confidence || 0) * 100)}%.
                Pattern: {analysis.pattern || 'unknown'}.
              </p>
            </div>

            <button
              onClick={() => navigate('occasion')}
              className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white"
            >
              Confirm & Continue
            </button>
          </div>
        )}

        {screen === 'occasion' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">Where are you going?</h2>
            <div className="grid grid-cols-2 gap-3">
              {OCCASIONS.map((item) => (
                <OptionButton
                  key={item}
                  label={item}
                  selected={occasion === item}
                  onClick={() => setOccasion(item)}
                />
              ))}
            </div>
            <button
              disabled={!occasion}
              onClick={() => navigate('feeling')}
              className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {screen === 'feeling' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              How do you want to feel?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {FEELINGS.map((item) => (
                <OptionButton
                  key={item}
                  label={item}
                  selected={feeling === item}
                  onClick={() => setFeeling(item)}
                />
              ))}
            </div>
            <button
              disabled={!feeling}
              onClick={() => navigate('inspiration')}
              className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {screen === 'inspiration' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                What inspired this look?
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Optional. Reference a decade, runway moment, designer, movie,
                place, mood, or cultural moment.
              </p>
            </div>

            <input
              type="text"
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
              placeholder="Mob Wife, To Pimp A Butterfly, Studio 54..."
              className="w-full rounded-2xl border border-neutral-200 p-4"
            />

            <div className="flex flex-wrap gap-2">
              {[
                '1930s surreal glamour',
                '1950s New Look',
                '1970s liberated ease',
                '1990s minimalism',
                'Galliano 2000',
                'Gothic romance',
                'Japandi restraint',
                'Studio 54',
                'Make it impressive'
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setInspiration(item)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    inspiration === item
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 bg-white text-neutral-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <button
              disabled={!canGenerate || clarifying}
              onClick={clarifyInspiration}
              className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white disabled:opacity-30"
            >
              {clarifying
                ? 'Interpreting reference...'
                : inspiration.trim()
                  ? 'Interpret Reference'
                  : 'Generate Looks'}
            </button>
          </div>
        )}

        {screen === 'clarifyInspiration' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Taste direction
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                What does “{inspiration}” mean here?
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Same reference, different taste. Pick the reading you want Reframed to
                build from.
              </p>
            </div>

            <div className="space-y-3">
              {inspirationDirections.length > 0 ? (
                inspirationDirections.map((direction) => (
                  <button
                    key={`${direction.title}-${direction.interpretation}`}
                    onClick={() => setSelectedDirection(direction)}
                    className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                      selectedDirection?.title === direction.title
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-500'
                    }`}
                  >
                    <span className="text-base font-semibold">{direction.title}</span>
                    <span className="mt-2 block text-sm opacity-80">
                      {direction.interpretation}
                    </span>
                    <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                      Styling codes
                    </span>
                    <span className="mt-1 block text-sm opacity-80">
                      {direction.stylingCodes.join(', ')}
                    </span>
                    <span className="mt-3 block text-sm opacity-80">
                      {direction.wearableTranslation}
                    </span>
                    {direction.whyThisFits && (
                      <span className="mt-3 block text-xs leading-relaxed opacity-70">
                        Why it fits: {direction.whyThisFits}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-neutral-500">
                  No strongly grounded directions found. Go back and try a more specific
                  reference.
                </p>
              )}
            </div>

            <button
              disabled={!selectedDirection}
              onClick={generateLooks}
              className="w-full rounded-full bg-black px-6 py-4 font-semibold text-white disabled:opacity-30"
            >
              Generate Looks From This Direction
            </button>
          </div>
        )}

        {screen === 'loading' && (
          <div className="flex min-h-[65vh] flex-col items-center justify-center gap-5 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-black" />
            <div>
              <h2 className="text-xl font-semibold">Generating options...</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Translating your item + context + inspiration into styling ideas.
              </p>
            </div>
          </div>
        )}

        {screen === 'recommendations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Your recommendations
              </h2>
              {analysis && (
                <p className="mt-2 text-sm text-neutral-500">
                  Confirmed: {analysis.color} {analysis.material} {analysis.category}
                </p>
              )}
              {inspiration && (
                <p className="mt-1 text-sm text-neutral-500">
                  Inspired by: {inspiration}
                </p>
              )}
              {selectedDirection && (
                <p className="mt-1 text-sm text-neutral-500">
                  Direction: {selectedDirection.title}
                </p>
              )}
            </div>

            {looks.map((look) => renderLookCard(look))}

            <button
              onClick={() => navigate('upload')}
              className="w-full rounded-full border border-neutral-200 px-6 py-4 font-semibold"
            >
              Style another item
            </button>
          </div>
        )}

        {screen === 'saved' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">Saved looks</h2>
            {savedLooks.length === 0 ? (
              <p className="py-12 text-center text-neutral-500">No saved looks yet.</p>
            ) : (
              savedLooks.map((look) => renderLookCard(look, true))
            )}
          </div>
        )}
      </section>
    </main>
  );
}

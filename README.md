# BeU Local AI Prototype

BeU helps users style the pieces they love but never reach for.

This is a local-only Next.js prototype. It does not use GitHub, Vercel, Supabase, login, payments, or a database.

## What it does

1. Upload one clothing item.
2. Select occasion, desired feeling, and environment.
3. The backend sends the image to OpenAI Vision.
4. The backend generates 3 recommendations: Conservative, Balanced, Statement.
5. The app shows text recommendations and either:
   - visual concept prompts, or
   - generated moodboard images if enabled.

## What is intentionally NOT included

- Full wardrobe management
- Pinterest integration
- Social feed
- Stylist marketplace
- Shopping recommendations
- Donation recommendations
- Authentication
- Payments
- Supabase database

## Mac setup

### 1. Install Node.js

Go to https://nodejs.org and install the LTS version.

To check if it worked, open Terminal and run:

```bash
node -v
npm -v
```

### 2. Open the project in Terminal

Unzip this folder. Then in Terminal:

```bash
cd path/to/beu-local-ai
```

Example if it is in Downloads:

```bash
cd ~/Downloads/beu-local-ai
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create your environment file

```bash
cp .env.example .env.local
```

Open `.env.local` in VS Code or TextEdit and replace:

```bash
OPENAI_API_KEY=sk-your-key-here
```

with your real OpenAI API key.

### 5. Run locally

```bash
npm run dev
```

Open this in your browser:

```text
http://localhost:3000
```

## Do I need GitHub?

No, not for local testing.

You only need GitHub later if you want to store code online or deploy to Vercel.

## Do I need a Next.js account?

No. Next.js is not an account or platform. It is a free coding framework.

## Do I need Vercel?

No, not for local testing.

Vercel is only needed when you want to publish BeU online.

## Do I need Supabase?

No, not for this local prototype.

Right now saved looks are stored only in browser memory. If you refresh the page, they disappear.

## Cost warning

OpenAI API calls cost money.

For cheaper testing, keep:

```bash
GENERATE_MOODBOARD_IMAGES=false
```

This will generate recommendations and visual prompts, but not real moodboard images.

When you want real generated moodboard images, set:

```bash
GENERATE_MOODBOARD_IMAGES=true
```

That will cost more because it generates images.

## Upload rules for best recognition

Use one clothing item only.
Avoid:

- piles of clothes
- full outfits on a person
- dark images
- tiny items far away from camera
- busy backgrounds

Best photo:

- one item
- good lighting
- item fills most of the frame
- plain background

## Troubleshooting

If you see "Missing OPENAI_API_KEY":

- Make sure `.env.local` exists.
- Make sure the key is pasted correctly.
- Stop the server with Ctrl+C.
- Run `npm run dev` again.

If AI says multiple items detected:

- Retake the photo with one item only.

If image generation fails:

- Set `GENERATE_MOODBOARD_IMAGES=false` and test text recommendations first.

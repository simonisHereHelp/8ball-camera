This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Drive manifest

Uploads write a `manifest.json` file into the target Google Drive folder. This manifest is merged on each `handleSave` upload so clients can avoid slow listings and resolve page trees and asset references.

Example `manifest.json`:

```json
{
  "folders": {
    "docs/HouseUtilities": "folderId_houseutilities"
  },
  "tree": {
    "docs/HouseUtilities": [
      "fileId_index_mdx",
      "fileId_houseutilities_md",
      "fileId_houseutilities_text"
    ]
  },
  "files": {
    "fileId_index_mdx": {
      "name": "index.mdx",
      "mime": "text/markdown"
    },
    "fileId_houseutilities_md": {
      "name": "HouseUtilities-一般文件-其他行動-20260112.md",
      "mime": "text/markdown"
    },
    "fileId_houseutilities_text": {
      "name": "HouseUtilitiesTEXT.txt",
      "mime": "text/plain"
    },
    "fileId_houseutilities_img": {
      "name": "HouseUtilities-一般文件-其他行動-20260112-p1.jpeg",
      "mime": "image/jpeg"
    }
  },
  "inlineAssets": {
    "fileId_houseutilities_md": {
      "./HouseUtilities-一般文件-其他行動-20260112-p1.jpeg": "fileId_houseutilities_img"
    }
  },
  "updatedAt": 1710000000000
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
